import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Transaction } from '../wallet/wallet.entity';
import { CronTasksService } from './cron-tasks.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [Transaction],
    }),
  ],
  providers: [CronTasksService],
})
export default class CronModule {}
