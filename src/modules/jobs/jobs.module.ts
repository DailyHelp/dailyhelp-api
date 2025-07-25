import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobService } from './jobs.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Job, JobTimeline } from './jobs.entity';
import { Transaction, Wallet } from '../wallet/wallet.entity';
import { Users } from '../users/users.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { JobDispute } from './job-dispute.entity';
import { Conversation } from '../conversations/conversations.entity';

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
      ],
    }),
  ],
  controllers: [JobsController],
  providers: [JobService],
  exports: [JobService],
})
export class JobsModule {}
