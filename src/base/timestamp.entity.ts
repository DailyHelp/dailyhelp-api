import { Entity, Property } from '@mikro-orm/core';

@Entity({ abstract: true })
export abstract class Timestamp {
  @Property({
    type: 'timestamp with time zone',
    name: 'created_at',
    defaultRaw: 'CURRENT_TIMESTAMP',
  })
  createdAt: Date = new Date();

  @Property({
    type: 'timestamp with time zone',
    name: 'updated_at',
    defaultRaw: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  deletedAt: Date;
}
