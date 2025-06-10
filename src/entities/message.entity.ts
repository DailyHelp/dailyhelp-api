import { Entity, Enum, Filter, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Timestamp } from "../base/timestamp.entity";
import { Conversation, Offer } from "../modules/conversations/conversations.entity";
import { Users } from "../modules/users/users.entity";
import { MessageType } from "../types";

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

  @Enum({ items: () => MessageType, default: MessageType.TEXT })
  type: MessageType;

  @ManyToOne(() => Offer, {
    fieldName: 'offer',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  offer: Offer;
}