import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Transaction } from './wallet.entity';
import { IAuthContext } from 'src/types';
import { PaginationInput } from 'src/base/dto';

@Injectable()
export class WalletService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Transaction)
    private readonly transactionRepository: EntityRepository<Transaction>,
  ) {}

  // TODO: Create pagination response

  async fetchUserTransactions(
    pagination: PaginationInput,
    { uuid, userType }: IAuthContext,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    const [transactions, totalTransactions] = await Promise.all([
      this.transactionRepository.find(
        {
          wallet: { user: { uuid }, userType },
        },
        { limit, offset },
      ),
      this.transactionRepository.count({
        wallet: { user: { uuid }, userType },
      }),
    ]);
    return { status: true, data: { transactions, totalTransactions } };
  }
}
