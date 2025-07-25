import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Transaction } from '../wallet/wallet.entity';
import { EntityManager, EntityRepository } from '@mikro-orm/core';

@Injectable()
export class CronTasksService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: EntityRepository<Transaction>,
    private readonly em: EntityManager
  ) {}

  @Cron('0 1 * * *', { timeZone: 'Africa/Lagos' })
  async unlockTransactions() {
    const forkedEm = this.em.fork();
    const thresholdTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const transactionsToUnlock = await this.transactionRepository.find(
      {
        locked: true,
        lockedAt: { $lte: thresholdTime }
      },
      { populate: ['wallet'] },
    );
    for (const transaction of transactionsToUnlock) {
      transaction.locked = false;
      transaction.releasedAt = new Date();
      transaction.wallet.availableBalance += transaction.amount;
    }
    await forkedEm.flush();
  }
}
