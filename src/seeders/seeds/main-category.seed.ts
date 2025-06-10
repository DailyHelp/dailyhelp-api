import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { MainCategory } from '../../modules/admin/admin.entities';
import { v4 } from 'uuid';
import { ISeeder } from '../seeder.interface';

@Injectable()
export default class MainCategorySeed implements ISeeder {
  constructor(private readonly em: EntityManager) {}

  async run(): Promise<void> {
    const forkedEm = this.em.fork();
    const mainCategories = await forkedEm.findAll(MainCategory);
    if (mainCategories.length) return;
    [
      'Home & Cleaning',
      'Repairs & Maintenance',
      'Food & Kitchen',
      'Family & Personal Care',
      'Transport & Delivery',
      'Tech & Digital Help',
      'Skilled Labor',
      'Events & Setup',
      'Automobile Services',
    ].forEach((name) => {
      const mainCategoryModel = forkedEm.create(MainCategory, {
        uuid: v4(),
        name,
        icon: '',
      });
      forkedEm.persist(mainCategoryModel);
    });
    await forkedEm.flush();
    console.log('Main Categories Seeded');
  }
}
