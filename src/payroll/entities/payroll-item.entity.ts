import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { AbstractEntity } from '../../abstractEntities';
import { PayrollRun } from './payroll-run.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { bigintTransformer } from '../../common/transformers';

export enum PayrollItemStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
}

@Entity('payroll_items')
export class PayrollItem extends AbstractEntity {
  @ManyToOne(() => PayrollRun, (run) => run.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  payrollRun: PayrollRun;

  @ManyToOne(() => Employee, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  employee: Employee;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  amount: number;

  // Platform fee charged for this payout (minor units).
  @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
  feeAmount: number;

  @Column({
    type: 'enum',
    enum: PayrollItemStatus,
    default: PayrollItemStatus.PENDING,
  })
  status: PayrollItemStatus;

  // Shared with the salary wallet DEBIT and the Paystack transfer.
  @Index()
  @Column({ nullable: true })
  reference?: string;

  // Reference of the separate FEE wallet DEBIT (if a fee was charged).
  @Column({ nullable: true })
  feeReference?: string;

  @Column({ nullable: true })
  paystackTransferCode?: string;

  @Column({ nullable: true })
  failureReason?: string;
}
