import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getSummary(@Param('companyId') companyId: string, @CurrentUser() user: User) {
    return this.walletService.getSummary(companyId, user);
  }

  @Get('transactions')
  getTransactions(
    @Param('companyId') companyId: string,
    @CurrentUser() user: User,
  ) {
    return this.walletService.getTransactions(companyId, user);
  }

  @Post('fund')
  fund(
    @Param('companyId') companyId: string,
    @Body() dto: FundWalletDto,
    @CurrentUser() user: User,
  ) {
    return this.walletService.initiateFunding(companyId, dto, user);
  }
}
