import { Entity, Filter, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { Timestamp } from '../base/timestamp.entity';
import { Users } from '../modules/users/users.entity';

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'notifications' })
export class Notification extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @ManyToOne(() => Users, {
    fieldName: 'recipient',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  recipient: Users;

  // Machine-readable event type, e.g. JOB_COMPLETED, OFFER_RECEIVED.
  @Property()
  type: string;

  @Property({ nullable: true })
  title: string;

  @Property({ type: 'longtext', nullable: true })
  body: string;

  // Optional JSON payload used by the client to deep-link (e.g. jobUuid).
  @Property({ type: 'longtext', nullable: true })
  data: string;

  @Property({ nullable: true })
  readAt: Date;
}
