import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankAccountNumber: string;

  @ApiProperty({ description: 'Paystack bank code, e.g. 058 for GTBank' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({ description: 'Salary in minor units (e.g. kobo)' })
  @IsInt()
  @Min(1)
  salaryAmount: number;

  @ApiProperty({ required: false, default: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ minimum: 1, maximum: 28, default: 1 })
  @IsInt()
  @Min(1)
  @Max(28)
  payDayOfMonth: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    required: false,
    default: true,
    description: 'Enroll this employee in automated (scheduled) payroll.',
  })
  @IsOptional()
  @IsBoolean()
  autoPayrollEnabled?: boolean;
}
