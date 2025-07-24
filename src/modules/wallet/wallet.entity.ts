import {
  Entity,
  Enum,
  Filter,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Timestamp } from '../../base/timestamp.entity';
import { Users } from '../users/users.entity';
import { TransactionType, UserType } from '../../types';
import { Job } from '../jobs/jobs.entity';
import { Payment } from '../conversations/conversations.entity';

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'wallets' })
export class Wallet extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalBalance: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  availableBalance: number;

  @ManyToOne(() => Users, {
    fieldName: 'user',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  user: Users;

  @Enum({ items: () => UserType, nullable: true })
  userType: UserType;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'transactions' })
export class Transaction extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Enum({ items: () => TransactionType })
  type: TransactionType;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @ManyToOne(() => Wallet, {
    fieldName: 'wallet',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  wallet: Wallet;

  @ManyToOne(() => Job, {
    fieldName: 'job',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  job: Job;

  @ManyToOne(() => Payment, {
    fieldName: 'payment',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  payment: Payment;

  @Property({ nullable: true })
  remark: string;

  @Property({ default: true })
  locked: boolean;

  @Property({ nullable: true })
  lockedAt: Date;

  @Property({ nullable: true })
  releasedAt: Date;
}
