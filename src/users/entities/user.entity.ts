import {Entity, Column, ManyToMany} from 'typeorm';
import { AbstractEntity } from '../../abstractEntities';
import { Company } from 'src/company/entities/company.entity';

@Entity("users")
export class User extends AbstractEntity {
  
  @ManyToMany(() => Company, (company) => company.users, { nullable: true })
  companies?: Company[];

  @ManyToMany(() => Company, (company) => company.adminUsers, { nullable: true })
  adminCompanies?: Company[];

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;
  
}

export default User;