import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Wallet } from './entities/wallet.entity';
import {
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  WalletTransaction,
} from './entities/wallet-transaction.entity';
import { Company } from '../company/entities/company.entity';
import { CompanyService } from '../company/company.service';
import { PaystackService } from '../payments/paystack.service';
import { MailService } from '../mail/mail.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { User } from '../users/entities/user.entity';
import { formatMoney } from '../common/money';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txnRepository: Repository<WalletTransaction>,
    private readonly companyService: CompanyService,
    private readonly paystack: PaystackService,
    private readonly mail: MailService,
  ) {}

  async getOrCreateForCompany(company: Company): Promise<Wallet> {
    const existing = await this.walletRepository.findOne({
      where: { company: { id: company.id } },
    });
    if (existing) {
      return existing;
    }
    const wallet = this.walletRepository.create({ company });
    return this.walletRepository.save(wallet);
  }

  /**
   * Derived balance: sum of successful credits minus successful debits.
   * Never stored — the ledger is the source of truth.
   */
  async getBalance(walletId: string): Promise<number> {
    const row = await this.txnRepository
      .createQueryBuilder('t')
      .innerJoin('t.wallet', 'w')
      .select(
        'COALESCE(SUM(CASE WHEN t.type = :credit THEN t.amount ELSE 0 END), 0)',
        'credit',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN t.type = :debit THEN t.amount ELSE 0 END), 0)',
        'debit',
      )
      .where('w.id = :walletId', { walletId })
      .andWhere('t.status = :status', { status: TransactionStatus.SUCCESS })
      .setParameters({
        credit: TransactionType.CREDIT,
        debit: TransactionType.DEBIT,
      })
      .getRawOne<{ credit: string; debit: string }>();
    return Number(row?.credit ?? 0) - Number(row?.debit ?? 0);
  }

  /**
   * Spendable balance: settled balance minus still-pending debits, so money
   * already committed to in-flight payouts cannot be spent twice.
   */
  async getAvailableBalance(walletId: string): Promise<number> {
    const settled = await this.getBalance(walletId);
    const pendingDebits = await this.sumDebits(
      walletId,
      TransactionStatus.PENDING,
    );
    return settled - pendingDebits;
  }

  private async sumDebits(
    walletId: string,
    status: TransactionStatus,
  ): Promise<number> {
    const row = await this.txnRepository
      .createQueryBuilder('t')
      .innerJoin('t.wallet', 'w')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('w.id = :walletId', { walletId })
      .andWhere('t.type = :type', { type: TransactionType.DEBIT })
      .andWhere('t.status = :status', { status })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  async getSummary(companyId: string, user: User) {
    const company = await this.companyService.findOneForUser(companyId, user);
    const wallet = await this.getOrCreateForCompany(company);
    const [balance, available] = await Promise.all([
      this.getBalance(wallet.id),
      this.getAvailableBalance(wallet.id),
    ]);
    return { id: wallet.id, currency: wallet.currency, balance, available };
  }

  async getTransactions(companyId: string, user: User) {
    const company = await this.companyService.findOneForUser(companyId, user);
    const wallet = await this.getOrCreateForCompany(company);
    return this.txnRepository.find({
      where: { wallet: { id: wallet.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async initiateFunding(companyId: string, dto: FundWalletDto, user: User) {
    const company = await this.companyService.findOneForUser(companyId, user);
    const wallet = await this.getOrCreateForCompany(company);
    const reference = `fund_${randomUUID()}`;

    const init = await this.paystack.initializeFunding({
      email: dto.email ?? user.email,
      amount: dto.amount,
      reference,
      metadata: {
        walletId: wallet.id,
        companyId: company.id,
        purpose: 'wallet_funding',
      },
    });

    // Record the funding as a PENDING credit; the webhook confirms it.
    await this.txnRepository.save(
      this.txnRepository.create({
        wallet,
        type: TransactionType.CREDIT,
        amount: dto.amount,
        reference,
        status: TransactionStatus.PENDING,
        category: TransactionCategory.FUNDING,
        metadata: { authorizationUrl: init.authorizationUrl },
      }),
    );

    return {
      reference,
      authorizationUrl: init.authorizationUrl,
      accessCode: init.accessCode,
    };
  }

  /** Reserves funds as a PENDING debit (counts against available balance). */
  reserveDebit(
    wallet: Wallet,
    amount: number,
    reference: string,
    category: TransactionCategory,
    metadata?: Record<string, any>,
  ) {
    return this.txnRepository.save(
      this.txnRepository.create({
        wallet,
        type: TransactionType.DEBIT,
        amount,
        reference,
        status: TransactionStatus.PENDING,
        category,
        metadata,
      }),
    );
  }

  /** Total platform fee revenue: sum of successful FEE debits across all wallets. */
  async getPlatformRevenue(): Promise<number> {
    const row = await this.txnRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.category = :category', { category: TransactionCategory.FEE })
      .andWhere('t.status = :status', { status: TransactionStatus.SUCCESS })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  /**
   * Marks a transaction successful by reference. Idempotent: a second call for
   * an already-successful reference is a no-op, so webhook retries are safe.
   */
  async confirmByReference(reference: string, metadata?: Record<string, any>) {
    const txn = await this.txnRepository.findOne({ where: { reference } });
    if (!txn) {
      this.logger.warn(`No transaction for reference ${reference}`);
      return null;
    }
    if (txn.status === TransactionStatus.SUCCESS) {
      return txn;
    }
    txn.status = TransactionStatus.SUCCESS;
    if (metadata) {
      txn.metadata = { ...(txn.metadata ?? {}), ...metadata };
    }
    return this.txnRepository.save(txn);
  }

  /** Marks a transaction FAILED (releasing a pending debit's reservation). */
  async failByReference(reference: string, metadata?: Record<string, any>) {
    const txn = await this.txnRepository.findOne({ where: { reference } });
    if (!txn) {
      this.logger.warn(`No transaction for reference ${reference}`);
      return null;
    }
    if (txn.status === TransactionStatus.SUCCESS) {
      return txn;
    }
    txn.status = TransactionStatus.FAILED;
    if (metadata) {
      txn.metadata = { ...(txn.metadata ?? {}), ...metadata };
    }
    return this.txnRepository.save(txn);
  }

  /**
   * Confirms a funding credit and notifies the company admin by email.
   * Called from the Paystack webhook on `charge.success`.
   */
  async confirmFunding(reference: string, metadata?: Record<string, any>) {
    const txn = await this.confirmByReference(reference, metadata);
    if (!txn || txn.type !== TransactionType.CREDIT) {
      return txn;
    }
    const full = await this.txnRepository.findOne({
      where: { id: txn.id },
      relations: { wallet: { company: { owner: true } } },
    });
    const company = full?.wallet?.company;
    if (company?.owner?.email && full) {
      const balance = await this.getBalance(full.wallet.id);
      await this.mail.sendWalletFunded(company.owner.email, {
        companyName: company.name,
        amount: formatMoney(txn.amount, full.wallet.currency),
        balance: formatMoney(balance, full.wallet.currency),
      });
    }
    return txn;
  }
}
