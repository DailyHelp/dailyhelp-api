import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import {
  AccountDeletionRequest,
  BlacklistedTokens,
  Feedback,
  Users,
} from './users.entity';
import { SharedModule } from '../shared/shared.module';
import { UsersController } from './users.controller';
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
  Payment,
  Report,
} from '../conversations/conversations.entity';
import { PublicUsersController } from './public-users.controller';
import { Message } from 'src/entities/message.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { ExpiredJwtStrategy } from 'src/strategies/expired-jwt.strategy';
import { Job, JobTimeline } from '../jobs/jobs.entity';
import { JwtModule } from '@nestjs/jwt';
import { SubCategory } from '../admin/admin.entities';
import { Transaction, Wallet } from '../wallet/wallet.entity';
import { JobDispute } from '../jobs/job-dispute.entity';

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
        Wallet,
        Transaction,
        JobDispute,
        Feedback,
        AccountDeletionRequest,
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
  ],
  controllers: [UsersController, PublicUsersController],
  providers: [UsersService, JwtStrategy, ExpiredJwtStrategy],
  exports: [UsersService],
})
export class UsersModule {}
