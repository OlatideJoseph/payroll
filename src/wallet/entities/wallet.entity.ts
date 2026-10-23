import { Entity, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../abstractEntities';
import { Company } from '../../company/entities/company.entity';
import { WalletTransaction } from './wallet-transaction.entity';

@Entity('wallets')
export class Wallet extends AbstractEntity {
  @OneToOne(() => Company, (company) => company.wallet, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  company: Company;

  @Column({ default: 'NGN' })
  currency: string;

  // The ledger. Balance is derived from these rows, never stored.
  @OneToMany(() => WalletTransaction, (txn) => txn.wallet)
  transactions: WalletTransaction[];
}
