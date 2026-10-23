import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollItem } from './entities/payroll-item.entity';
import { PayrollService } from './payroll.service';
import { PayrollSchedulerService } from './payroll-scheduler.service';
import { PayrollController } from './payroll.controller';
import { WorkerController } from './worker.controller';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { CompanyModule } from '../company/company.module';
import { EmployeesModule } from '../employees/employees.module';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentsModule } from '../payments/payments.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayrollRun, PayrollItem]),
    CompanyModule,
    EmployeesModule,
    WalletModule,
    PaymentsModule,
    MailModule,
  ],
  controllers: [PayrollController, WorkerController, PaystackWebhookController],
  providers: [PayrollService, PayrollSchedulerService],
  exports: [PayrollService],
})
export class PayrollModule {}
