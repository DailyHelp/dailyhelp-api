import {
  Entity,
  Filter,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Timestamp } from '../../base/timestamp.entity';

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

  @Property({ nullable: true })
  email: string;

  @Property({ nullable: true })
  password: string;
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
