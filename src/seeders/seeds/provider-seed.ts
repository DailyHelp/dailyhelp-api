import { Injectable } from '@nestjs/common';
import { ISeeder } from '../seeder.interface';
import { EntityManager } from '@mikro-orm/core';
import { Users } from '../../modules/users/users.entity';
import { SubCategory } from '../../modules/admin/admin.entities';
import { v4 } from 'uuid';

@Injectable()
export default class ProviderSeed implements ISeeder {
  constructor(private readonly em: EntityManager) {}

  async run(): Promise<void> {
    const fork = this.em.fork();
    const existingProviders = await fork.count(Users, {
      userTypes: { $like: '%provider%' },
    });
    if (existingProviders > 100) {
      console.log('ProviderSeed: providers already exist, skipping.');
      return;
    }
    const subCategories = await fork.find(SubCategory, {});
    if (!subCategories.length) {
      console.warn(
        'ProviderSeed: no SubCategory found. Run Main/SubCategory seeds first.',
      );
      return;
    }
    const firstNames = [
      'Ayo',
      'Tunde',
      'Chika',
      'Ife',
      'Sade',
      'Ada',
      'Kunle',
      'Ngozi',
      'Bola',
      'Uche',
      'Kemi',
      'Emeka',
      'Femi',
      'Zainab',
      'Hassan',
      'Ibrahim',
      'Ruth',
      'Blessing',
      'Gbenga',
      'Amaka',
    ];
    const lastNames = [
      'Okafor',
      'Adeyemi',
      'Olaoye',
      'Musa',
      'Okeke',
      'Ojo',
      'Balogun',
      'Muhammed',
      'Eze',
      'Ibrahim',
      'Udo',
      'Umar',
      'Ogunleye',
      'Olawale',
      'Okon',
      'Abiola',
      'Nwosu',
      'Ogunbiyi',
      'Ekwueme',
      'Salami',
    ];
    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const randMoney = (min: number, max: number) =>
      Number((Math.random() * (max - min) + min).toFixed(2));

    const randNgPhone = () => {
      const prefixes = ['070', '080', '081', '090', '091'];
      let rest = '';
      for (let i = 0; i < 8; i++) rest += Math.floor(Math.random() * 10);
      return `${pick(prefixes)}${rest}`;
    };
    const batch: Users[] = [];
    for (let i = 0; i < 100; i++) {
      const first = pick(firstNames);
      const last = pick(lastNames);
      const sub = pick(subCategories);

      const minPrice = randMoney(3000, 20000);
      const startPrice = randMoney(minPrice, minPrice + 30000);
      const completedJobs = randInt(0, 200);
      const ratedCompletedJobs = randInt(0, completedJobs);
      const rating = Number((Math.random() * 2 + 3).toFixed(1));
      const progress = `${randInt(0, 95)}%`;

      const email =
        `${first}.${last}.${Date.now()}_${i}@example.com`.toLowerCase();

      batch.push(
        fork.create(Users, {
          uuid: v4(),
          firstname: first,
          lastname: last,
          email,
          phone: randNgPhone(),
          password: `$2b$12$VNCNtnBKxgDvieRnCQ/0/eyHq1AFJ3C13xUGctTz0UBsn481JWBrO`,
          emailVerified: false,
          phoneVerified: false,
          picture: null,
          identityVerified: true,
          lastLoggedIn: null,
          nin: null,
          bvn: null,
          deviceToken: null,
          ninData: null,
          bvnData: null,
          defaultLocation: null,
          providerAddress: null,
          primaryJobRole: fork.getReference(SubCategory, sub.uuid),
          serviceDescription: `${sub.name} services with reliable scheduling, transparent pricing, and great customer support.`,
          serviceImages: `https://picsum.photos/seed/provider-${i}-1/800/600,https://picsum.photos/seed/provider-${i}-2/800/600`,

          offerStartingPrice: startPrice,
          minimumOfferPrice: minPrice,

          availability: true,
          engaged: false,

          avgRating: rating,
          completedJobs,
          ratedCompletedJobs,
          progressToNextTier: progress,

          userTypes: 'provider',
          providerOnboarding: null,
          utilityBill: null,
        }),
      );
    }
    await fork.persistAndFlush(batch);
    console.log(`ProviderSeed: seeded ${batch.length} providers.`);
  }
}
