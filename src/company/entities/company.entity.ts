import {
  Entity,
  Column,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { AbstractEntity } from '../../abstractEntities';
import { User } from 'src/users/entities/user.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { Wallet } from 'src/wallet/entities/wallet.entity';

@Entity('companies')
export class Company extends AbstractEntity {
  @Column()
  name: string;

  @Column()
  address: string;

  // The admin who created the company.
  @ManyToOne(() => User, (user) => user.ownedCompanies, {
    nullable: false,
    eager: true,
  })
  owner: User;

  @ManyToMany(() => User, (user) => user.adminCompanies)
  @JoinTable()
  adminUsers: User[];

  @OneToMany(() => Employee, (employee) => employee.company)
  employees: Employee[];

  @OneToOne(() => Wallet, (wallet) => wallet.company)
  wallet: Wallet;
}
