import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import {
  AccountDeletionRequest,
  BankAccount,
  BlacklistedTokens,
  Feedback,
  Users,
} from './users.entity';
import { SharedModule } from '../shared/shared.module';
import { CustomersController } from './customers.controller';
import {
  JwtAuthConfiguration,
  PaystackConfiguration,
  QoreIDConfiguration,
} from 'src/config/configuration';
import { UsersService } from './users.service';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { Location } from 'src/entities/location.entity';
import {
  Conversation,
  Offer,
  Report,
} from '../conversations/conversations.entity';
import { ConversationReadState, Message } from 'src/entities/message.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { ExpiredJwtStrategy } from 'src/strategies/expired-jwt.strategy';
import { Job, JobTimeline } from '../jobs/jobs.entity';
import { JwtModule } from '@nestjs/jwt';
import { AccountTierSetting, SubCategory } from '../admin/admin.entities';
import { Transaction, Wallet } from '../wallet/wallet.entity';
import { JobDispute } from '../jobs/job-dispute.entity';
import { ProvidersController } from './providers.controller';
import { Payment } from '../../entities/payment.entity';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [
    ConfigModule.forFeature(JwtAuthConfiguration),
    ConfigModule.forFeature(QoreIDConfiguration),
    ConfigModule.forFeature(PaystackConfiguration),
    MikroOrmModule.forFeature({
      entities: [
        Users,
        BlacklistedTokens,
        Location,
        JobReview,
        Conversation,
        Message,
        Offer,
        Payment,
        Job,
        Report,
        JobTimeline,
        SubCategory,
        AccountTierSetting,
        Wallet,
        Transaction,
        JobDispute,
        Feedback,
        AccountDeletionRequest,
        BankAccount,
        ConversationReadState,
      ],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(JwtAuthConfiguration)],
      useFactory: (jwtAuthConfig: ConfigType<typeof JwtAuthConfiguration>) => ({
        secret: jwtAuthConfig.secretKey,
        signOptions: { expiresIn: '24h' },
      }),
      inject: [JwtAuthConfiguration.KEY],
    }),
    SharedModule,
    WsModule,
  ],
  controllers: [CustomersController, ProvidersController],
  providers: [UsersService, JwtStrategy, ExpiredJwtStrategy],
  exports: [UsersService],
})
export class UsersModule {}
