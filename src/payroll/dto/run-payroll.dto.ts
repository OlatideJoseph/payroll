import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/** Admin-triggered manual run. */
export class RunPayrollDto {
  @ApiProperty({
    required: false,
    default: false,
    description:
      'When true, only pay employees whose pay day is today; otherwise pay all active employees.',
  })
  @IsOptional()
  @IsBoolean()
  dueOnly?: boolean;
}
