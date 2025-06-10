import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlacklistedTokens, Users } from './users.entity';
import { SharedModule } from '../shared/shared.module';
import { UsersController } from './users.controller';
import {
  JwtAuthConfiguration,
  QoreIDConfiguration,
} from 'src/config/configuration';
import { UsersService } from './users.service';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { Location } from 'src/entities/location.entity';
import {
  Conversation,
  Offer,
} from '../conversations/conversations.entity';
import { PublicUsersController } from './public-users.controller';
import { Message } from 'src/entities/message.entity';
import { JobReview } from 'src/entities/job-review.entity';

@Module({
  imports: [
    ConfigModule.forFeature(JwtAuthConfiguration),
    ConfigModule.forFeature(QoreIDConfiguration),
    MikroOrmModule.forFeature({
      entities: [
        Users,
        BlacklistedTokens,
        Location,
        JobReview,
        Conversation,
        Message,
        Offer,
      ],
    }),
    SharedModule,
  ],
  controllers: [UsersController, PublicUsersController],
  providers: [UsersService, JwtStrategy],
  exports: [UsersService],
})
export class UsersModule {}
