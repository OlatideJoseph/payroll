import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SetEmployeeFeeDto } from './dto/set-employee-fee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('companies')
  companies() {
    return this.adminService.listCompanies();
  }

  @Get('users')
  users() {
    return this.adminService.listUsers();
  }

  @Get('payroll-runs')
  payrollRuns() {
    return this.adminService.listPayrollRuns();
  }

  @Get('revenue')
  revenue() {
    return this.adminService.revenue();
  }

  @Patch('employees/:id/fee')
  setFee(@Param('id') id: string, @Body() dto: SetEmployeeFeeDto) {
    return this.adminService.setEmployeeFee(id, dto.fee);
  }
}
