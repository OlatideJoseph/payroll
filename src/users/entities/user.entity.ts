import { Entity, Column, ManyToMany, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../abstractEntities';
import { Company } from 'src/company/entities/company.entity';

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

@Entity('users')
export class User extends AbstractEntity {
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  // Never selected by default; must be explicitly requested (e.g. on login).
  @Column({ select: false })
  password: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.ADMIN })
  role: UserRole;

  // Companies this user created / owns.
  @OneToMany(() => Company, (company) => company.owner)
  ownedCompanies?: Company[];

  // Companies where this user is an admin.
  @ManyToMany(() => Company, (company) => company.adminUsers, {
    nullable: true,
  })
  adminCompanies?: Company[];
}

export default User;
