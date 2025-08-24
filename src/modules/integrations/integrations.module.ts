import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { ConfigModule } from '@nestjs/config';
import { PaystackConfiguration } from 'src/config/configuration';
import { ExternalIntegrationsController } from './external-integrations.controller';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Conversation, Offer } from '../conversations/conversations.entity';
import { Transaction, Wallet } from '../wallet/wallet.entity';
import { Job, JobTimeline } from '../jobs/jobs.entity';
import { Users } from '../users/users.entity';
import { Payment } from '../../entities/payment.entity';

@Module({
  imports: [
    ConfigModule.forFeature(PaystackConfiguration),
    MikroOrmModule.forFeature({
      entities: [
        Payment,
        Wallet,
        Transaction,
        Offer,
        Conversation,
        Job,
        JobTimeline,
        Users,
      ],
    }),
  ],
  providers: [IntegrationsService],
  controllers: [ExternalIntegrationsController],
})
export class IntegrationsModule {}
