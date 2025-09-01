import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { ReadStateService } from './read-state.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import {
  ConversationReadState,
  Message,
  MessageReceipt,
} from 'src/entities/message.entity';
import { Users } from '../users/users.entity';
import { Conversation } from '../conversations/conversations.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthConfiguration } from 'src/config/configuration';
import { PresenceService } from './presence.service';
import { RedisProvider } from './redis.provider';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [
        MessageReceipt,
        Message,
        Users,
        ConversationReadState,
        Conversation,
      ],
    }),
    ConfigModule.forFeature(JwtAuthConfiguration),
  ],
  providers: [SocketGateway, ReadStateService, PresenceService, RedisProvider],
  exports: [SocketGateway, ReadStateService, PresenceService],
})
export class WsModule {}
