import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  QoreIDConfiguration,
  SendgridConfiguration,
  TermiiConfiguration,
} from 'src/config/configuration';
import { NotificationTemplates } from 'src/entities/notification-templates.entity';
import { SharedService } from './shared.service';

@Module({
  imports: [
    ConfigModule.forFeature(SendgridConfiguration),
    ConfigModule.forFeature(TermiiConfiguration),
    ConfigModule.forFeature(QoreIDConfiguration),
    MikroOrmModule.forFeature({
      entities: [NotificationTemplates],
    }),
  ],
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {}
