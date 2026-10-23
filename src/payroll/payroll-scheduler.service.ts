import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmployeesService } from '../employees/employees.service';
import { PayrollService } from './payroll.service';
import { PayrollTrigger } from './entities/payroll-run.entity';
import { Company } from '../company/entities/company.entity';
import { Employee } from '../employees/entities/employee.entity';

@Injectable()
export class PayrollSchedulerService {
  private readonly logger = new Logger(PayrollSchedulerService.name);

  constructor(
    private readonly employeesService: EmployeesService,
    private readonly payrollService: PayrollService,
  ) {}

  /** Daily settlement: pay employees whose pay day is today, per company. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailySettlement() {
    const day = new Date().getDate();
    const due = await this.employeesService.findAllDueToday(day);
    if (due.length === 0) {
      return;
    }

    const groups = new Map<
      string,
      { company: Company; employees: Employee[] }
    >();
    for (const employee of due) {
      if (!employee.company) {
        continue;
      }
      const group = groups.get(employee.company.id) ?? {
        company: employee.company,
        employees: [],
      };
      group.employees.push(employee);
      groups.set(employee.company.id, group);
    }

    for (const { company, employees } of groups.values()) {
      if (await this.payrollService.hasScheduledRunToday(company.id)) {
        this.logger.log(
          `Skipping company ${company.id}: already settled today`,
        );
        continue;
      }
      this.logger.log(
        `Scheduled payroll for company ${company.id} (${employees.length} due)`,
      );
      await this.payrollService.executeRun(
        company,
        employees,
        PayrollTrigger.SCHEDULED,
      );
    }
  }
}
