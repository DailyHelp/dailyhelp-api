import { Module, forwardRef } from '@nestjs/common';
import { CustomerJobsController } from './customer-jobs.controller';
import { JobService } from './jobs.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Job, JobTimeline } from './jobs.entity';
import { Transaction, Wallet } from '../wallet/wallet.entity';
import { Users } from '../users/users.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { JobDispute } from './job-dispute.entity';
import { Conversation } from '../conversations/conversations.entity';
import { ProviderJobsController } from './provider-jobs.controller';
import { JobReport } from './job-reports.entity';
import { WsModule } from '../ws/ws.module';
import { AccountTierSetting } from '../admin/admin.entities';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [
        Job,
        JobTimeline,
        Wallet,
        Transaction,
        Users,
        JobReview,
        JobDispute,
        Conversation,
        JobReport,
        AccountTierSetting,
      ],
    }),
    forwardRef(() => WsModule),
  ],
  controllers: [CustomerJobsController, ProviderJobsController],
  providers: [JobService],
  exports: [JobService],
})
export class JobsModule {}
