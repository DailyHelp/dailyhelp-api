import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { MainCategory, ReasonCategory } from '../admin/admin.entities';
import { EntityRepository } from '@mikro-orm/core';
import { ReasonCategoryType } from 'src/types';

@Injectable()
export class ListService {
  constructor(
    @InjectRepository(MainCategory)
    private readonly mainCategoryRepository: EntityRepository<MainCategory>,
    @InjectRepository(ReasonCategory)
    private readonly reasonCategoryRepository: EntityRepository<ReasonCategory>,
  ) {}

  async fetchCategories() {
    return {
      status: true,
      data: await this.mainCategoryRepository.findAll({
        populate: ['categories'],
        orderBy: { createdAt: 'DESC' },
      }),
    };
  }

  async fetchReasonCategories(type: ReasonCategoryType) {
    return {
      status: true,
      data: await this.reasonCategoryRepository.findAll({
        where: {
          ...(type ? { type } : {}),
        },
      }),
    };
  }
}
