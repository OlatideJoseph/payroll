import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { AbstractEntity } from '../../abstractEntities';
import { Wallet } from './wallet.entity';
import { bigintTransformer } from '../../common/transformers';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum TransactionCategory {
  FUNDING = 'funding',
  PAYOUT = 'payout',
  FEE = 'fee',
}

@Entity('wallet_transactions')
export class WalletTransaction extends AbstractEntity {
  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  wallet: Wallet;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  // Amount in minor currency units (e.g. kobo). Always positive.
  @Column({ type: 'bigint', transformer: bigintTransformer })
  amount: number;

  // Idempotency key / provider reference.
  @Index({ unique: true })
  @Column()
  reference: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  // What the money movement is for: wallet funding, a salary payout, or a platform fee.
  @Column({ type: 'enum', enum: TransactionCategory, nullable: true })
  category?: TransactionCategory;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
