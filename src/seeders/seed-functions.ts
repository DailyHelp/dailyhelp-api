import { INestApplicationContext, Logger } from '@nestjs/common';
import SeederModule from './seeder.module';
import { ISeeder } from './seeder.interface';

const logger = new Logger('MainSeeder');

export const startSeeding = async (appContext: INestApplicationContext) => {
  const seedsArray = SeederModule.seederClasses;
  for (let index = 0; index < seedsArray.length; index++) {
    const seed = seedsArray[index];
    const seedClass = appContext.get<ISeeder>(seed);
    logger.log(`About seeding ${seed.name}`);
    await seedClass.run();
    logger.log(`Done seeding ${seed.name}`);
  }
};
