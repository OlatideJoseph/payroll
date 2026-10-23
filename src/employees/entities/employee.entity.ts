import { Entity, Column, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../abstractEntities';
import { Company } from '../../company/entities/company.entity';
import { bigintTransformer } from '../../common/transformers';

@Entity('employees')
export class Employee extends AbstractEntity {
  @ManyToOne(() => Company, (company) => company.employees, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  company: Company;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column()
  bankAccountNumber: string;

  @Column()
  bankCode: string;

  @Column()
  accountName: string;

  // Salary in minor currency units (e.g. kobo).
  @Column({ type: 'bigint', transformer: bigintTransformer })
  salaryAmount: number;

  @Column({ default: 'NGN' })
  currency: string;

  // Day of the month (1-28) this employee is paid.
  @Column({ type: 'int', default: 1 })
  payDayOfMonth: number;

  @Column({ default: true })
  active: boolean;

  // Enrolled in automated (scheduled) payroll.
  @Column({ default: true })
  autoPayrollEnabled: boolean;

  // Custom per-payout fee (minor units), set by superadmin. Null => platform default.
  @Column({ type: 'bigint', nullable: true, transformer: bigintTransformer })
  payrollFee?: number | null;

  // Populated when a Paystack transfer recipient is created (Phase 2).
  @Column({ nullable: true })
  paystackRecipientCode?: string;
}
