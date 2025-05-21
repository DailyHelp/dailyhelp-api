import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { Timestamp } from '../base/timestamp.entity';

@Entity({ tableName: 'notification_templates' })
export class NotificationTemplates extends Timestamp {
  @PrimaryKey()
  uuid!: string;

  @Property()
  @Unique()
  code!: string;

  @Property({ type: 'longtext' })
  body!: string;
}
