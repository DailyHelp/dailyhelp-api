import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Transaction } from '../wallet/wallet.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [Transaction],
    }),
  ],
})
export default class CronModule {}
