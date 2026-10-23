import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { RunPayrollDto } from './dto/run-payroll.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('run')
  run(
    @Param('companyId') companyId: string,
    @Body() dto: RunPayrollDto,
    @CurrentUser() user: User,
  ) {
    return this.payrollService.runManual(companyId, user, dto.dueOnly ?? false);
  }

  @Get()
  list(@Param('companyId') companyId: string, @CurrentUser() user: User) {
    return this.payrollService.listRuns(companyId, user);
  }

  @Get(':id')
  getOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.payrollService.getRun(companyId, id, user);
  }
}
