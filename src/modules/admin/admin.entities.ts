import {
  Collection,
  Entity,
  Enum,
  Filter,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { Timestamp } from '../../base/timestamp.entity';
import { AccountTier, ReasonCategoryType } from '../../types';
import { ApiProperty } from '@nestjs/swagger';

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'admin_users' })
export class AdminUser extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ nullable: true })
  fullname: string;

  @Property({ nullable: true, columnType: 'varchar(150)', fieldName: 'first_name' })
  firstName?: string;

  @Property({ nullable: true, columnType: 'varchar(150)', fieldName: 'last_name' })
  lastName?: string;

  @Property({ nullable: true })
  email: string;

  @Property({ nullable: true })
  password: string;

  @Property({ type: 'boolean', fieldName: 'is_temporary_password', default: false })
  isTemporaryPassword: boolean = false;

  @ManyToMany(() => AdminRole, (role) => role.users, {
    owner: true,
    pivotTable: 'admin_user_roles',
    joinColumn: 'admin_user_uuid',
    inverseJoinColumn: 'role_uuid',
  })
  roles = new Collection<AdminRole>(this);
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'admin_roles' })
export class AdminRole extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property()
  @Unique()
  name: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ default: false })
  isSystem: boolean;

  @ManyToMany(() => AdminPermission, (permission) => permission.roles, {
    owner: true,
    pivotTable: 'admin_role_permissions',
    joinColumn: 'role_uuid',
    inverseJoinColumn: 'permission_uuid',
  })
  permissions = new Collection<AdminPermission>(this);

  @ManyToMany(() => AdminUser, (user) => user.roles)
  users = new Collection<AdminUser>(this);
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'admin_permissions' })
export class AdminPermission extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property()
  @Unique()
  code: string;

  @Property()
  name: string;

  @Property()
  module: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ default: false })
  isModulePermission: boolean;

  @Property({ nullable: true })
  displayOrder?: number;

  @ManyToMany(() => AdminRole, (role) => role.permissions)
  roles = new Collection<AdminRole>(this);
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'main_categories' })
export class MainCategory extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ nullable: true })
  name: string;

  @Property({ nullable: true })
  icon: string;

  @OneToMany(() => SubCategory, (sc) => sc.mainCategory, {
    lazy: true,
  })
  categories: Promise<SubCategory[]>;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'sub_categories' })
export class SubCategory extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ nullable: true })
  name: string;

  @ManyToOne(() => MainCategory, {
    fieldName: 'main_category',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  mainCategory: MainCategory;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'reason_category' })
export class ReasonCategory extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property({ nullable: true })
  name: string;

  @ApiProperty({ enum: ReasonCategoryType, required: false })
  @Enum({
    items: () => ReasonCategoryType,
    nullable: true,
  })
  type: ReasonCategoryType;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'account_tier_settings' })
export class AccountTierSetting extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @ApiProperty({ enum: AccountTier })
  @Enum({ items: () => AccountTier })
  tier: AccountTier;

  @Property({ nullable: true })
  label?: string;

  @Property({ nullable: true })
  levelLabel?: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ columnType: 'int', default: 0 })
  minJobs: number;

  @Property({ columnType: 'decimal(5,2)', default: 0 })
  minAvgRating: number;

  @Property({ columnType: 'int', default: 0 })
  displayOrder: number;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'job_tips' })
export class JobTip extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @Property()
  title: string;

  @Property({ type: 'longtext', nullable: true })
  description?: string;
}
