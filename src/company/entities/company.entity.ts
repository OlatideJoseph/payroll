import { Entity, Column, JoinTable, ManyToMany } from 'typeorm';
import { AbstractEntity } from '../../abstractEntities';
import { User } from 'src/users/entities/user.entity';

@Entity("companies")
export class Company extends AbstractEntity {
  @Column()
  name: string;

  @Column()
  address: string;

  @ManyToMany(() => User, (user) => user.companies, { nullable: false })
  @JoinTable()
  users: User[];

  @ManyToMany(() => User, (user) => user.adminCompanies, { nullable: false })
  @JoinTable()
  adminUsers: User[];
}
