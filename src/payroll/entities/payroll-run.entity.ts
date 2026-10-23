import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../abstractEntities';
import { Company } from '../../company/entities/company.entity';
import { PayrollItem } from './payroll-item.entity';
import { bigintTransformer } from '../../common/transformers';

export enum PayrollRunStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PARTIALLY_COMPLETED = 'partially_completed',
  FAILED = 'failed',
}

export enum PayrollTrigger {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  WORKER = 'worker',
}

@Entity('payroll_runs')
export class PayrollRun extends AbstractEntity {
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  company: Company;

  @Column({
    type: 'enum',
    enum: PayrollRunStatus,
    default: PayrollRunStatus.PENDING,
  })
  status: PayrollRunStatus;

  @Column({
    type: 'enum',
    enum: PayrollTrigger,
    default: PayrollTrigger.MANUAL,
  })
  trigger: PayrollTrigger;

  // Total salary successfully dispatched, in minor units.
  @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
  totalAmount: number;

  // Total platform fees charged across this run, in minor units.
  @Column({ type: 'bigint', transformer: bigintTransformer, default: 0 })
  totalFees: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt?: Date;

  @OneToMany(() => PayrollItem, (item) => item.payrollRun, { cascade: true })
  items: PayrollItem[];
}
