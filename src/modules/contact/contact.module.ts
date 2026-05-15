import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmtpConfiguration } from 'src/config/configuration';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

@Module({
  imports: [ConfigModule.forFeature(SmtpConfiguration)],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
