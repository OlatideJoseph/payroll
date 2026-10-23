import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { TransactionCategory } from '../wallet/entities/wallet-transaction.entity';
import {
  PayrollRun,
  PayrollRunStatus,
  PayrollTrigger,
} from './entities/payroll-run.entity';
import { PayrollItem, PayrollItemStatus } from './entities/payroll-item.entity';
import { Company } from '../company/entities/company.entity';
import { Employee } from '../employees/entities/employee.entity';
import { CompanyService } from '../company/company.service';
import { EmployeesService } from '../employees/employees.service';
import { WalletService } from '../wallet/wallet.service';
import { PaystackService } from '../payments/paystack.service';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { formatMoney } from '../common/money';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);
  private readonly defaultFee: number;

  constructor(
    @InjectRepository(PayrollRun)
    private readonly runRepo: Repository<PayrollRun>,
    @InjectRepository(PayrollItem)
    private readonly itemRepo: Repository<PayrollItem>,
    private readonly companyService: CompanyService,
    private readonly employeesService: EmployeesService,
    private readonly walletService: WalletService,
    private readonly paystack: PaystackService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.defaultFee = Number(
      this.config.get<string>('DEFAULT_PAYROLL_FEE', '0'),
    );
  }

  // --- Entry points ---

  /** Admin-triggered manual run (ownership-scoped). */
  async runManual(companyId: string, user: User, dueOnly = false) {
    const company = await this.companyService.findOneForUser(companyId, user);
    const employees = dueOnly
      ? await this.employeesService.findDueToday(companyId, todayDayOfMonth())
      : await this.employeesService.findActive(companyId);
    return this.executeRun(company, employees, PayrollTrigger.MANUAL);
  }

  /** Worker-triggered settlement for one company (not user-scoped). */
  async runForWorker(companyId: string, all = false) {
    const company = await this.companyService.findById(companyId);
    const employees = all
      ? await this.employeesService.findActive(companyId)
      : await this.employeesService.findDueToday(companyId, todayDayOfMonth());
    return this.executeRun(company, employees, PayrollTrigger.WORKER);
  }

  /** History + detail (ownership-scoped). */
  async listRuns(companyId: string, user: User) {
    await this.companyService.findOneForUser(companyId, user);
    return this.runRepo.find({
      where: { company: { id: companyId } },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  /** Platform-wide run history (superadmin). */
  findAllRuns() {
    return this.runRepo.find({
      relations: { items: true, company: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getRun(companyId: string, id: string, user: User) {
    await this.companyService.findOneForUser(companyId, user);
    return this.runRepo.findOne({
      where: { id, company: { id: companyId } },
      relations: { items: true },
    });
  }

  async hasScheduledRunToday(companyId: string): Promise<boolean> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const count = await this.runRepo.count({
      where: {
        company: { id: companyId },
        trigger: PayrollTrigger.SCHEDULED,
        createdAt: MoreThanOrEqual(start),
      },
    });
    return count > 0;
  }

  // --- Core payout execution ---

  /**
   * Pays each employee up to the wallet's available balance. Employees that
   * fit are paid (transfer dispatched, DEBIT reserved); the rest are marked
   * INSUFFICIENT_FUNDS. Transfers finalize asynchronously via webhook.
   */
  async executeRun(
    company: Company,
    employees: Employee[],
    trigger: PayrollTrigger,
  ): Promise<PayrollRun | null> {
    const wallet = await this.walletService.getOrCreateForCompany(company);
    let run = this.runRepo.create({
      company,
      trigger,
      status: PayrollRunStatus.PROCESSING,
      currency: wallet.currency,
    });
    run = await this.runRepo.save(run);

    let available = await this.walletService.getAvailableBalance(wallet.id);
    let dispatchedTotal = 0;
    let dispatchedFees = 0;
    const items: PayrollItem[] = [];

    for (const employee of employees) {
      const amount = Number(employee.salaryAmount);
      const fee = employee.payrollFee ?? this.defaultFee;
      const total = amount + fee;

      // Company pays salary + fee; the employee receives the full salary.
      if (available < total) {
        items.push(
          this.itemRepo.create({
            payrollRun: run,
            employee,
            amount,
            feeAmount: fee,
            status: PayrollItemStatus.INSUFFICIENT_FUNDS,
            failureReason: 'Insufficient wallet balance',
          }),
        );
        continue;
      }

      const reference = `payout_${randomUUID()}`;
      const feeReference = fee > 0 ? `fee_${randomUUID()}` : undefined;
      const item = this.itemRepo.create({
        payrollRun: run,
        employee,
        amount,
        feeAmount: fee,
        reference,
        feeReference,
        status: PayrollItemStatus.PROCESSING,
      });
      let reservedSalary = false;
      let reservedFee = false;
      try {
        let recipientCode = employee.paystackRecipientCode;
        if (!recipientCode) {
          const recipient = await this.paystack.createTransferRecipient({
            name: employee.accountName,
            accountNumber: employee.bankAccountNumber,
            bankCode: employee.bankCode,
            currency: wallet.currency,
          });
          recipientCode = recipient.recipientCode;
          await this.employeesService.setRecipientCode(
            employee.id,
            recipientCode,
          );
        }

        await this.walletService.reserveDebit(
          wallet,
          amount,
          reference,
          TransactionCategory.PAYOUT,
          { payrollRunId: run.id, employeeId: employee.id },
        );
        reservedSalary = true;
        available -= amount;

        if (feeReference) {
          await this.walletService.reserveDebit(
            wallet,
            fee,
            feeReference,
            TransactionCategory.FEE,
            { payrollRunId: run.id, employeeId: employee.id },
          );
          reservedFee = true;
          available -= fee;
        }

        // Transfer the salary only; the fee stays as platform revenue.
        const transfer = await this.paystack.initiateTransfer({
          amount,
          recipientCode,
          reference,
          reason: `Salary from ${company.name}`,
        });
        item.paystackTransferCode = transfer.transferCode;
        dispatchedTotal += amount;
        dispatchedFees += fee;
      } catch (err) {
        const message = (err as Error).message;
        this.logger.error(
          `Payout failed for employee ${employee.id}: ${message}`,
        );
        item.status = PayrollItemStatus.FAILED;
        item.failureReason = message;
        if (reservedSalary) {
          await this.walletService.failByReference(reference).catch(() => null);
          available += amount;
        }
        if (reservedFee && feeReference) {
          await this.walletService
            .failByReference(feeReference)
            .catch(() => null);
          available += fee;
        }
      }
      items.push(item);
    }

    await this.itemRepo.save(items);

    run.totalAmount = dispatchedTotal;
    run.totalFees = dispatchedFees;
    run.status = summarizeStatus(items);
    run.processedAt = new Date();
    await this.runRepo.save(run);

    return this.runRepo.findOne({
      where: { id: run.id },
      relations: { items: true },
    });
  }

  // --- Webhook finalization ---

  /** Called from the Paystack webhook on transfer.success / transfer.failed. */
  async markTransferResult(
    reference: string,
    success: boolean,
    meta?: Record<string, any>,
  ) {
    const item = await this.itemRepo.findOne({
      where: { reference },
      relations: { payrollRun: { company: true } },
    });
    if (!item) {
      this.logger.warn(`No payroll item for transfer reference ${reference}`);
      return;
    }

    if (success) {
      item.status = PayrollItemStatus.SUCCESS;
      await this.walletService.confirmByReference(reference, meta);
      if (item.feeReference) {
        await this.walletService.confirmByReference(item.feeReference, meta);
      }
    } else {
      item.status = PayrollItemStatus.FAILED;
      item.failureReason =
        (meta?.reason as string) ?? 'Transfer failed at provider';
      // No payout means no fee: release both reservations.
      await this.walletService.failByReference(reference, meta);
      if (item.feeReference) {
        await this.walletService.failByReference(item.feeReference, meta);
      }
    }
    await this.itemRepo.save(item);
    await this.refreshRunStatus(item.payrollRun.id);
    await this.notify(item, success);
  }

  private async refreshRunStatus(runId: string) {
    const run = await this.runRepo.findOne({
      where: { id: runId },
      relations: { items: true },
    });
    if (!run) {
      return;
    }
    run.status = summarizeStatus(run.items);
    await this.runRepo.save(run);
  }

  private async notify(item: PayrollItem, success: boolean) {
    const employee = item.employee; // eager
    const company = item.payrollRun?.company;
    const name = `${employee.firstName} ${employee.lastName}`;
    const amount = formatMoney(item.amount, employee.currency);
    const companyName = company?.name ?? 'your employer';
    if (success) {
      await this.mail.sendPayoutSuccess(employee.email, {
        employeeName: name,
        amount,
        companyName,
        reference: item.reference ?? '',
      });
    } else {
      await this.mail.sendPayoutFailed(employee.email, {
        employeeName: name,
        amount,
        companyName,
        reason: item.failureReason ?? 'Transfer failed',
      });
    }
  }
}

function todayDayOfMonth(): number {
  return new Date().getDate();
}

/** Derives a run's status from its items (dispatched/processing counts as in-flight). */
function summarizeStatus(items: PayrollItem[]): PayrollRunStatus {
  const succeeded = items.filter(
    (i) => i.status === PayrollItemStatus.SUCCESS,
  ).length;
  const inFlight = items.filter(
    (i) =>
      i.status === PayrollItemStatus.PROCESSING ||
      i.status === PayrollItemStatus.PENDING,
  ).length;
  const dispatched = succeeded + inFlight;

  if (dispatched === 0) {
    return PayrollRunStatus.FAILED;
  }
  if (inFlight > 0) {
    return PayrollRunStatus.PROCESSING;
  }
  if (succeeded === items.length) {
    return PayrollRunStatus.COMPLETED;
  }
  return PayrollRunStatus.PARTIALLY_COMPLETED;
}
