import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { MainCategory, ReasonCategory } from '../admin/admin.entities';
import { ListsController } from './lists.controller';
import { ListService } from './lists.service';
import { PaymentModule } from '../payments/payment.module';

@Module({
  imports: [
    MikroOrmModule.forFeature({ entities: [MainCategory, ReasonCategory] }),
    PaymentModule,
  ],
  controllers: [ListsController],
  providers: [ListService],
})
export class ListModule {}
