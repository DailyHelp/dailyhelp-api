import {
  Entity,
  Enum,
  Filter,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Timestamp } from '../base/timestamp.entity';
import {
  Conversation,
  Offer,
} from '../modules/conversations/conversations.entity';
import { Users } from '../modules/users/users.entity';
import { MessageStatus, MessageType } from '../types';
import { ApiProperty } from '@nestjs/swagger';

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'messages' })
export class Message extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @ManyToOne(() => Conversation, {
    fieldName: 'conversation',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  conversation: Conversation;

  @ManyToOne(() => Users, {
    fieldName: 'from',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  from: Users;

  @ManyToOne(() => Users, {
    fieldName: 'to',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  to: Users;

  @Property({ nullable: true })
  message: string;

  @ApiProperty({ enum: MessageType })
  @Enum({ items: () => MessageType, default: MessageType.TEXT })
  type: MessageType;

  @ApiProperty({ enum: MessageStatus })
  @Enum({ items: () => MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;

  @ManyToOne(() => Offer, {
    fieldName: 'offer',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  offer: Offer;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'message_receipts' })
export class MessageReceipt extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @ManyToOne(() => Message, {
    fieldName: 'message',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  message: Message;

  @ManyToOne(() => Users, {
    fieldName: 'user',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  user: Users;

  @Property({ nullable: true })
  deliveredAt: Date;

  @Property({ nullable: true })
  readAt: Date;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'conversation_read_states' })
export class ConversationReadState extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @ManyToOne(() => Conversation, {
    fieldName: 'conversation',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  conversation: Conversation;

  @ManyToOne(() => Users, {
    fieldName: 'user',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  user: Users;

  @Property({ nullable: true })
  lastReadAt: Date;

  @Property({ default: 0 })
  unreadCount: number;
}
