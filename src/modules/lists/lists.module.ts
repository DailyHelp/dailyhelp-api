import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { MainCategory, ReasonCategory } from '../admin/admin.entities';
import { ListsController } from './lists.controller';
import { ListService } from './lists.service';
import { ConfigModule } from '@nestjs/config';
import { PaystackConfiguration } from 'src/config/configuration';

@Module({
  imports: [
    MikroOrmModule.forFeature({ entities: [MainCategory, ReasonCategory] }),
    ConfigModule.forFeature(PaystackConfiguration),
  ],
  controllers: [ListsController],
  providers: [ListService],
})
export class ListModule {}
