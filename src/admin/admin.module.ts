import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperadminSeederService } from './superadmin-seeder.service';
import { CompanyModule } from '../company/company.module';
import { UsersModule } from '../users/users.module';
import { EmployeesModule } from '../employees/employees.module';
import { PayrollModule } from '../payroll/payroll.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    CompanyModule,
    UsersModule,
    EmployeesModule,
    PayrollModule,
    WalletModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, SuperadminSeederService],
})
export class AdminModule {}
