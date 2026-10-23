import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/** Worker-triggered settlement for a single company. */
export class WorkerRunDto {
  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'When true, pay all active employees; otherwise only those due today.',
  })
  @IsOptional()
  @IsBoolean()
  all?: boolean;
}
