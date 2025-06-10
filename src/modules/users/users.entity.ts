import {
  Entity,
  Enum,
  Filter,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Timestamp } from '../../base/timestamp.entity';
import { SubCategory } from '../admin/admin.entities';
import { AccountTier } from '../../types';
import { Location } from '../../entities/location.entity';

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'users' })
export class Users extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ nullable: true })
  firstname: string;

  @Property({ nullable: true })
  middlename: string;

  @Property({ nullable: true })
  dob: string;

  @Property({ nullable: true })
  gender: string;

  @Property({ nullable: true })
  lastname: string;

  @Property({ nullable: true })
  email: string;

  @Property({ nullable: true })
  phone: string;

  @Property({ nullable: true })
  password: string;

  @Property({ default: false })
  emailVerified: boolean;

  @Property({ default: false })
  phoneVerified: boolean;

  @Property({ nullable: true })
  picture: string;

  @Property({ default: false })
  identityVerified: boolean;

  @Property({ type: 'datetime', nullable: true })
  lastLoggedIn: Date;

  @Property({ nullable: true })
  nin: string;

  @Property({ nullable: true })
  bvn: string;

  @Property({ nullable: true })
  deviceToken: string;

  @Property({ type: 'json', nullable: true })
  ninData: string;

  @Property({ type: 'json', nullable: true })
  bvnData: string;

  @ManyToOne(() => Location, {
    fieldName: 'default_location',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  defaultLocation: Location;

  @ManyToOne(() => SubCategory, {
    fieldName: 'primary_job_role',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  primaryJobRole: SubCategory;

  @Property({ nullable: true })
  serviceDescription: string;

  @Property({ nullable: true })
  serviceImages: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  offerStartingPrice: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumOfferPrice: number;

  @Property({ default: true })
  availability: boolean;

  @Property({ default: false })
  engaged: boolean;

  @Enum({ items: () => AccountTier, default: AccountTier.BRONZE })
  tier: AccountTier;

  @Property({ nullable: true })
  avgRating: number;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'otp' })
export class OTP extends Timestamp {
  @PrimaryKey()
  uuid!: string;

  @Property({ length: 6 })
  otp!: string;

  @Property()
  pinId!: string;

  @Property({ type: 'datetime', nullable: true })
  expiredAt: Date;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'blacklisted_tokens' })
export class BlacklistedTokens extends Timestamp {
  @PrimaryKey()
  uuid!: string;

  @Property({ type: 'longtext', nullable: true })
  token!: string;
}
