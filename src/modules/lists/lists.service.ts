import { InjectRepository } from '@mikro-orm/nestjs';
import { Inject, Injectable } from '@nestjs/common';
import { MainCategory, ReasonCategory } from '../admin/admin.entities';
import { EntityRepository } from '@mikro-orm/core';
import { ReasonCategoryType } from 'src/types';
import { PaystackConfiguration } from 'src/config/configuration';
import { ConfigType } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ListService {
  constructor(
    @InjectRepository(MainCategory)
    private readonly mainCategoryRepository: EntityRepository<MainCategory>,
    @InjectRepository(ReasonCategory)
    private readonly reasonCategoryRepository: EntityRepository<ReasonCategory>,
    @Inject(PaystackConfiguration.KEY)
    private readonly paystackConfig: ConfigType<typeof PaystackConfiguration>,
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

  async fetchBanks() {
    const response = await axios.get(`${this.paystackConfig.baseUrl}/bank`, {
      headers: {
        Authorization: `Bearer ${this.paystackConfig.secretKey}`,
      },
    });
    return response.data;
  }
}
