import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import {
  MainCategory,
  ReasonCategory,
  SubCategory,
} from '../modules/admin/admin.entities';
import { ISeederConstructor } from './seeder.interface';

@Module({
  imports: [
    DatabaseModule.forRoot(),
    MikroOrmModule.forFeature({
      entities: [MainCategory, SubCategory, ReasonCategory],
    }),
  ],
})
export default class SeederModule {
  public static seederClasses: ISeederConstructor[] = [];
  static forRoot(seeders: ISeederConstructor[]): DynamicModule {
    SeederModule.seederClasses = seeders || [];
    return {
      global: true,
      module: SeederModule,
      providers: seeders,
    };
  }
}
