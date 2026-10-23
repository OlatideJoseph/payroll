import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, Min } from 'class-validator';

export class FundWalletDto {
  @ApiProperty({ description: 'Amount to fund in minor units (e.g. kobo)' })
  @IsInt()
  @Min(100)
  amount: number;

  @ApiProperty({
    required: false,
    description:
      'Payer email for the Paystack checkout; defaults to the admin.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
