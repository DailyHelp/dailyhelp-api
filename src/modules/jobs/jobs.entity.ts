import {
  Entity,
  Enum,
  Filter,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Timestamp } from '../../base/timestamp.entity';
import { Users } from '../users/users.entity';
import { JobStatus, UserType } from '../../types';
import { JobDispute } from './job-dispute.entity';
import { JobReview } from '../../entities/job-review.entity';
import { Payment } from '../../entities/payment.entity';

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'jobs' })
export class Job extends Timestamp {
  @PrimaryKey()
  uuid!: string;

  @ManyToOne(() => Users, {
    fieldName: 'service_provider',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  serviceProvider: Users;

  @ManyToOne(() => Users, {
    fieldName: 'service_requestor',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  serviceRequestor: Users;

  @Property({ nullable: true })
  requestId: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Enum({ items: () => JobStatus, default: JobStatus.PENDING })
  status: JobStatus;

  @Property({ nullable: true })
  startDate: Date;

  @Property({ nullable: true })
  endDate: Date;

  @Property({ type: 'longtext', nullable: true })
  description: string;

  @Property({ type: 'longtext', nullable: true })
  pictures: string;

  @Property({ nullable: true })
  code: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tip: number;

  @ManyToOne(() => JobDispute, {
    fieldName: 'dispute',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  dispute: JobDispute;

  @ManyToOne(() => JobReview, {
    fieldName: 'review',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
    eager: true,
  })
  review: JobReview;

  @ManyToOne(() => Payment, {
    fieldName: 'payment',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  payment: Payment;

  @Property({ nullable: true })
  acceptedAt: Date;

  @Property({ nullable: true })
  cancelledAt: Date;

  @Property({ nullable: true })
  cancellationReason: string;

  @Property({ nullable: true })
  cancellationCategory: string;
}

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'job_timelines' })
export class JobTimeline extends Timestamp {
  @PrimaryKey()
  uuid!: string;

  @ManyToOne(() => Job, {
    fieldName: 'job',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  job: Job;

  @Property({ nullable: true })
  event: string;

  @ManyToOne(() => Users, {
    fieldName: 'actor',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  actor: Users;
}
