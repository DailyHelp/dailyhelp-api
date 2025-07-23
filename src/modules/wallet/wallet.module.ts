import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Transaction } from './wallet.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [MikroOrmModule.forFeature({ entities: [Transaction] })],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
