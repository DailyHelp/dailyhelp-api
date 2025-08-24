import { Entity, Enum, Filter, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Timestamp } from "src/base/timestamp.entity";
import { Offer, Conversation } from "src/modules/conversations/conversations.entity";
import { Users } from "src/modules/users/users.entity";
import { UserType, PaymentType, Currencies } from "src/types";

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'payments' })
export class Payment extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ nullable: true })
  reference: string;

  @Property({ nullable: true })
  transactionId: string;

  @ManyToOne(() => Users, {
    fieldName: 'user',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  user: Users;

  @ManyToOne(() => Offer, {
    fieldName: 'offer',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  offer: Offer;

  @ManyToOne(() => Conversation, {
    fieldName: 'conversation',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  conversation: Conversation;

  @Enum({ items: () => UserType })
  userType: UserType;

  @Property({ nullable: true })
  processedAt: Date;

  @Property({ nullable: true })
  status: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Property({ nullable: true })
  channel: string;

  @Property({ type: 'longtext', nullable: true })
  metadata: string;

  @Enum({ items: () => PaymentType })
  type: PaymentType;

  @Enum({ items: () => Currencies, default: Currencies.NGN })
  currency: Currencies;
}
