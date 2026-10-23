import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CompanyService } from '../company/company.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly companyService: CompanyService,
  ) {}

  async create(companyId: string, dto: CreateEmployeeDto, user: User) {
    const company = await this.companyService.findOneForUser(companyId, user);
    const employee = this.employeeRepository.create({ ...dto, company });
    return this.employeeRepository.save(employee);
  }

  async bulkCreate(companyId: string, dtos: CreateEmployeeDto[], user: User) {
    const company = await this.companyService.findOneForUser(companyId, user);
    const employees = dtos.map((dto) =>
      this.employeeRepository.create({ ...dto, company }),
    );
    return this.employeeRepository.save(employees);
  }

  async findAll(companyId: string, user: User) {
    await this.companyService.findOneForUser(companyId, user);
    return this.employeeRepository.find({
      where: { company: { id: companyId } },
    });
  }

  async findOne(companyId: string, id: string, user: User) {
    await this.companyService.findOneForUser(companyId, user);
    const employee = await this.employeeRepository.findOne({
      where: { id, company: { id: companyId } },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateEmployeeDto,
    user: User,
  ) {
    const employee = await this.findOne(companyId, id, user);
    Object.assign(employee, dto);
    return this.employeeRepository.save(employee);
  }

  async remove(companyId: string, id: string, user: User) {
    const employee = await this.findOne(companyId, id, user);
    await this.employeeRepository.remove(employee);
    return { deleted: true };
  }

  // --- Used by the payroll engine (not user-scoped) ---

  /** All active employees of a company. */
  findActive(companyId: string) {
    return this.employeeRepository.find({
      where: { company: { id: companyId }, active: true },
    });
  }

  /** Enrolled, active employees of a company whose pay day is `day` (1-28). */
  findDueToday(companyId: string, day: number) {
    return this.employeeRepository.find({
      where: {
        company: { id: companyId },
        active: true,
        autoPayrollEnabled: true,
        payDayOfMonth: day,
      },
    });
  }

  /** All enrolled, active employees across every company whose pay day is `day`. */
  findAllDueToday(day: number) {
    return this.employeeRepository.find({
      where: { active: true, autoPayrollEnabled: true, payDayOfMonth: day },
      relations: { company: true },
    });
  }

  /** Persists the Paystack transfer-recipient code once created. */
  async setRecipientCode(employeeId: string, recipientCode: string) {
    await this.employeeRepository.update(employeeId, {
      paystackRecipientCode: recipientCode,
    });
  }

  /** Superadmin-only: set an employee's custom automated-payroll fee. */
  async setFee(employeeId: string, fee: number) {
    const employee = await this.employeeRepository.findOneBy({
      id: employeeId,
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    employee.payrollFee = fee;
    return this.employeeRepository.save(employee);
  }
}
