import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { BulkCreateEmployeeDto } from './dto/bulk-create-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: User,
  ) {
    return this.employeesService.create(companyId, dto, user);
  }

  @Post('bulk')
  bulkCreate(
    @Param('companyId') companyId: string,
    @Body() dto: BulkCreateEmployeeDto,
    @CurrentUser() user: User,
  ) {
    return this.employeesService.bulkCreate(companyId, dto.employees, user);
  }

  @Get()
  findAll(@Param('companyId') companyId: string, @CurrentUser() user: User) {
    return this.employeesService.findAll(companyId, user);
  }

  @Get(':id')
  findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.employeesService.findOne(companyId, id, user);
  }

  @Patch(':id')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: User,
  ) {
    return this.employeesService.update(companyId, id, dto, user);
  }

  @Delete(':id')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.employeesService.remove(companyId, id, user);
  }
}
