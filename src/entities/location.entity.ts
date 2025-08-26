import {
  Entity,
  Enum,
  Filter,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Timestamp } from '../base/timestamp.entity';
import { Users } from '../modules/users/users.entity';
import { UserType } from '../types';

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'locations' })
export class Location extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ nullable: true })
  address: string;

  @Property({ nullable: true })
  state: string;

  @Property({ nullable: true })
  lga: string;

  @Property({ type: 'longtext', nullable: true })
  description: string;

  @Property({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  lat: number;

  @Property({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  lng: number;

  @Property({ default: false })
  verified: boolean;

  @ManyToOne(() => Users, {
    fieldName: 'user',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  user: Users;

  @Enum({ items: () => UserType })
  userType: UserType;

  isDefault: boolean;
}
