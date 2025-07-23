import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { WalletService } from './wallet.service';
import { PaginationQuery } from '../users/users.dto';
import { Request } from 'express';

@Controller('wallets')
@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('transactions')
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  async fetchUserTransactions(
    @Query() query: PaginationQuery,
    @Req() request: Request,
  ) {
    return this.walletService.fetchUserTransactions(
      query.pagination,
      request.user as any,
    );
  }
}
