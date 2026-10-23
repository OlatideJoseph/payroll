import { Injectable } from '@nestjs/common';
import { CompanyService } from '../company/company.service';
import { UsersService } from '../users/users.service';
import { EmployeesService } from '../employees/employees.service';
import { PayrollService } from '../payroll/payroll.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly companyService: CompanyService,
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
    private readonly payrollService: PayrollService,
    private readonly walletService: WalletService,
  ) {}

  listCompanies() {
    return this.companyService.findAllCompanies();
  }

  listUsers() {
    return this.usersService.findAll();
  }

  listPayrollRuns() {
    return this.payrollService.findAllRuns();
  }

  async revenue() {
    return { totalRevenue: await this.walletService.getPlatformRevenue() };
  }

  setEmployeeFee(employeeId: string, fee: number) {
    return this.employeesService.setFee(employeeId, fee);
  }
}
