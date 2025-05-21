import { Entity, Filter, PrimaryKey, Property } from '@mikro-orm/core';
import { Timestamp } from '../../base/timestamp.entity';

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
