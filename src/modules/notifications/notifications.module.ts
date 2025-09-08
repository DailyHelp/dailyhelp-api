import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ConfigModule } from '@nestjs/config';
import { FirebaseConfiguration } from 'src/config/configuration';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Users } from '../users/users.entity';
import { Conversation } from '../conversations/conversations.entity';

@Module({
  imports: [
    ConfigModule.forFeature(FirebaseConfiguration),
    MikroOrmModule.forFeature({ entities: [Users, Conversation] }),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

