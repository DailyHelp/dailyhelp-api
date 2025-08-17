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
import { AccountTier, IProviderOnboarding, UserType } from '../../types';
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
    eager: true,
  })
  defaultLocation: Location;

  @ManyToOne(() => Location, {
    fieldName: 'provider_address',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
    eager: true,
  })
  providerAddress: Location;

  @ManyToOne(() => SubCategory, {
    fieldName: 'primary_job_role',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
    eager: true,
  })
  primaryJobRole: SubCategory;

  @Property({ nullable: true, type: 'longtext' })
  serviceDescription: string;

  @Property({ nullable: true, type: 'longtext' })
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

  @Enum({ items: () => AccountTier, default: AccountTier.BRONZE })
  nextTier: AccountTier;

  @Property({ nullable: true })
  avgRating: number;

  @Property({ nullable: true, default: 0 })
  completedJobs: number;

  @Property({ nullable: true, default: 0 })
  ratedCompletedJobs: number;

  @Property({ nullable: true })
  progressToNextTier: string;

  @Property({ nullable: true })
  userTypes: string;

  @Property({ type: 'json', nullable: true })
  providerOnboarding: IProviderOnboarding;

  @Property({ nullable: true })
  utilityBill: string;
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
@Entity({ tableName: 'bank_account' })
export class BankAccount extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ nullable: true })
  accountNumber: string;

  @Property({ nullable: true })
  bankName: string;

  @Property({ nullable: true })
  accountName: string;

  @Property({ nullable: true })
  bankCode: string;

  @ManyToOne(() => Users, {
    fieldName: 'user',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  user: Users;
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

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'feedbacks' })
export class Feedback extends Timestamp {
  @PrimaryKey()
  uuid!: string;

  @ManyToOne(() => Users, {
    fieldName: 'user',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  user: Users;

  @Property({ nullable: true })
  title: string;

  @Property({ type: 'longtext', nullable: true })
  description: string;

  @Enum({ items: () => UserType, nullable: true })
  userType: UserType;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'account_deletion_requests' })
export class AccountDeletionRequest extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @ManyToOne(() => Users, {
    fieldName: 'user',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  user: Users;

  @Property({ nullable: true })
  reason: string;

  @Enum({ items: () => UserType, nullable: true })
  userType: UserType;

  @Property({ type: 'datetime', nullable: true })
  confirmedAt: Date;
}
