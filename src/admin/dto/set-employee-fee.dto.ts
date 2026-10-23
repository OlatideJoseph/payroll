import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SetEmployeeFeeDto {
  @ApiProperty({
    description: 'Custom automated-payroll fee in minor units (e.g. kobo).',
  })
  @IsInt()
  @Min(0)
  fee: number;
}
