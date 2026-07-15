import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { MainCategory, ReasonCategory } from '../admin/admin.entities';
import { EntityRepository } from '@mikro-orm/core';
import { ReasonCategoryType } from 'src/types';
import { PaymentGatewayService } from '../payments/payment-gateway.service';

@Injectable()
export class ListService {
  constructor(
    @InjectRepository(MainCategory)
    private readonly mainCategoryRepository: EntityRepository<MainCategory>,
    @InjectRepository(ReasonCategory)
    private readonly reasonCategoryRepository: EntityRepository<ReasonCategory>,
    private readonly paymentGateway: PaymentGatewayService,
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
    const banks = await this.paymentGateway.listBanks();
    return { status: true, data: banks };
  }
}
