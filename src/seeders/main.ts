import { DynamicModule, INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import SeederModule from './seeder.module';
import MainCategorySeed from './seeds/main-category.seed';
import { startSeeding } from './seed-functions';
import SubCategorySeed from './seeds/sub-category.seed';
import ReasonCategorySeed from './seeds/reason-category.seed';

const SeederModuleRegister = (): DynamicModule => {
  return SeederModule.forRoot([
    MainCategorySeed,
    SubCategorySeed,
    ReasonCategorySeed,
  ]);
};

export async function bootstrap() {
  const appContext: INestApplicationContext =
    await NestFactory.createApplicationContext(SeederModuleRegister());
  await startSeeding(appContext);
  appContext.close();
}
