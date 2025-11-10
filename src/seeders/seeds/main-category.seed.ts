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
    const categories = [
      {
        name: 'Home & Cleaning',
        icon: 'https://res.cloudinary.com/dznfeps0z/image/upload/v1762644621/Cleaning_Broom_Icon_1_f90gpm.svg',
      },
      {
        name: 'Repairs & Maintenance',
        icon: 'https://res.cloudinary.com/dznfeps0z/image/upload/v1762644694/Cleaning_Broom_Icon_1_1_wuodew.svg',
      },
      {
        name: 'Food & Kitchen',
        icon: 'https://res.cloudinary.com/dznfeps0z/image/upload/v1762644735/Cleaning_Broom_Icon_1_2_yqvxl3.svg',
      },
      {
        name: 'Family & Personal Care',
        icon: 'https://res.cloudinary.com/dznfeps0z/image/upload/v1762644777/Cleaning_Broom_Icon_1_3_sxjiyt.svg',
      },
      {
        name: 'Transport & Delivery',
        icon: 'https://res.cloudinary.com/dznfeps0z/image/upload/v1762644823/Cleaning_Broom_Icon_1_4_nca05r.svg',
      },
      {
        name: 'Tech & Digital Help',
        icon: 'https://res.cloudinary.com/dznfeps0z/image/upload/v1762644877/Laptop_Repair_Service_dzk8ey.svg',
      },
      {
        name: 'Skilled Labor',
        icon: 'https://res.cloudinary.com/dznfeps0z/image/upload/v1762644925/Tools_settings_icon_tlmvg3.svg',
      },
      {
        name: 'Events & Setup',
        icon: 'https://res.cloudinary.com/dznfeps0z/image/upload/v1762644982/Event_Party_Icon_rlpubc.svg',
      },
      {
        name: 'Automobile Services',
        icon: 'https://res.cloudinary.com/dznfeps0z/image/upload/v1762645021/Automobile_Service_Icon_p1joe3.svg',
      },
    ];

    categories.forEach(({ name, icon }) => {
      const mainCategoryModel = forkedEm.create(MainCategory, {
        uuid: v4(),
        name,
        icon,
      });
      forkedEm.persist(mainCategoryModel);
    });
    await forkedEm.flush();
    console.log('Main Categories Seeded');
  }
}
