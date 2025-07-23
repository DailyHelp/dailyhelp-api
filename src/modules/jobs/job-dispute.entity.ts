import {
  Entity,
  Enum,
  Filter,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Timestamp } from '../../base/timestamp.entity';
import { DisputeStatus, JobStatus, UserType } from '../../types';
import { Users } from '../users/users.entity';
import { Job } from './jobs.entity';

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'job_disputes' })
export class JobDispute extends Timestamp {
  @PrimaryKey()
  uuid!: string;

  @ManyToOne(() => Job, {
    fieldName: 'job',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true
  })
  job: Job;

  @Property({ nullable: true })
  category: string;

  @Property({ type: 'longtext', nullable: true })
  description: string;

  @Property({ type: 'longtext', nullable: true })
  pictures: string;

  @Enum({ items: () => DisputeStatus, default: DisputeStatus.PENDING })
  status: DisputeStatus;

  @ManyToOne(() => Users, {
    fieldName: 'submitted_by',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  submittedBy: Users;

  @ManyToOne(() => Users, {
    fieldName: 'submitted_for',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  submittedFor: Users;

  @Enum({ items: () => UserType, nullable: true })
  userType: UserType;
}
