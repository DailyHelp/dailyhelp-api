import { Entity, Enum, Filter, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Timestamp } from "../base/timestamp.entity";
import { Offer, Conversation } from "../modules/conversations/conversations.entity";
import { Users } from "../modules/users/users.entity";
import { UserType, PaymentType, Currencies } from "../types";
import { ApiProperty } from "@nestjs/swagger";

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

  @ApiProperty({ enum: UserType })
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

  @ApiProperty({ enum: PaymentType })
  @Enum({ items: () => PaymentType })
  type: PaymentType;

  @ApiProperty({ enum: Currencies })
  @Enum({ items: () => Currencies, default: Currencies.NGN })
  currency: Currencies;
}
