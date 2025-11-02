import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import {
  AccountTierSetting,
  AdminPermission,
  AdminRole,
  AdminUser,
  JobTip,
  MainCategory,
  ReasonCategory,
  SubCategory,
} from './admin.entities';
import { OTP, Users } from '../users/users.entity';
import { Job, JobTimeline } from '../jobs/jobs.entity';
import { JobDispute } from '../jobs/job-dispute.entity';
import { Conversation, Report } from '../conversations/conversations.entity';
import { Feedback } from '../users/users.entity';
import { Message } from 'src/entities/message.entity';
import { Wallet, Transaction } from '../wallet/wallet.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { JwtAuthConfiguration } from 'src/config/configuration';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminLocalStrategy } from './strategies/local.strategy';
import { AdminJwtStrategy } from './strategies/jwt.strategy';
import { AdminController } from './admin.controller';
import { SharedModule } from '../shared/shared.module';
import { AdminPermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [
        AdminUser,
        AdminRole,
        AdminPermission,
        MainCategory,
        SubCategory,
        ReasonCategory,
        AccountTierSetting,
        JobTip,
        OTP,
        Users,
        Job,
        JobTimeline,
        JobDispute,
        Conversation,
        Report,
        Feedback,
        Message,
        Wallet,
        Transaction,
        JobReview,
      ],
    }),
    PassportModule,
    ConfigModule.forFeature(JwtAuthConfiguration),
    SharedModule,
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(JwtAuthConfiguration)],
      useFactory: (jwtAuthConfig: ConfigType<typeof JwtAuthConfiguration>) => ({
        secret: jwtAuthConfig.adminSecretKey,
        signOptions: { expiresIn: '24h' },
      }),
      inject: [JwtAuthConfiguration.KEY],
    }),
  ],
  providers: [
    AdminService,
    AdminLocalStrategy,
    AdminJwtStrategy,
    AdminPermissionsGuard,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
