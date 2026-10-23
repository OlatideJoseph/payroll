import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEmployeeDto } from './create-employee.dto';

export class BulkCreateEmployeeDto {
  @ApiProperty({ type: [CreateEmployeeDto] })
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateEmployeeDto)
  employees: CreateEmployeeDto[];
}
