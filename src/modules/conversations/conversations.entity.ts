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
import { OfferStatus } from '../../types';
import { Message } from '../../entities/message.entity';

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'conversations' })
export class Conversation extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @ManyToOne(() => Users, {
    fieldName: 'service_provider',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  serviceProvider: Users;

  @ManyToOne(() => Users, {
    fieldName: 'service_requestor',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  serviceRequestor: Users;

  @Property({ nullable: true })
  lastLockedAt: Date;

  @Property({ default: false })
  locked: boolean;

  @Property({ default: true })
  restricted: boolean;

  @ManyToOne(() => Users, {
    fieldName: 'blocked_by',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  blockedBy: Users;

  @Property({ default: false })
  blocked: boolean;

  @Property({ default: 3 })
  cancellationChances: number;

  @ManyToOne(() => Message, {
    fieldName: 'last_message',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  lastMessage: Message;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'offers' })
export class Offer extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Property({ nullable: true })
  description: string;

  @Property({ type: 'longtext', nullable: true })
  pictures: string;

  @Enum({ items: () => OfferStatus, default: OfferStatus.PENDING })
  status: OfferStatus;

  @ManyToOne(() => Offer, {
    fieldName: 'current_offer',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  currentOffer: Offer;

  @Property({ nullable: true })
  declinedReason: string;

  @Property({ nullable: true })
  declinedReasonCategory: string;

  @Property({ nullable: true })
  cancelledReason: string;

  @Property({ nullable: true })
  cancelledReasonCategory: string;

  @Property({ nullable: true })
  counterReason: string;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'reports' })
export class Report extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ nullable: true })
  reportCategory: string;

  @Property({ type: 'longtext', nullable: true })
  description: string;

  @Property({ type: 'longtext', nullable: true })
  pictures: string;

  @ManyToOne(() => Users, {
    fieldName: 'submitted_by',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  submittedBy: Users;

  @ManyToOne(() => Conversation, {
    fieldName: 'conversation',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  conversation: Conversation;
}
