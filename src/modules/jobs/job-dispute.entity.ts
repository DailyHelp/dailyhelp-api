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
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'job_disputes' })
export class JobDispute extends Timestamp {
  @PrimaryKey()
  uuid!: string;

  @ApiProperty({ type: () => Job, required: false })
  @Type(() => Job)
  @ManyToOne(() => Job, {
    fieldName: 'job',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true
  })
  job: Job;

  @Property({ nullable: true })
  code: string;

  @Property({ nullable: true })
  category: string;

  @Property({ type: 'longtext', nullable: true })
  description: string;

  @Property({ type: 'longtext', nullable: true })
  pictures: string;

  @ApiProperty({ enum: DisputeStatus })
  @Enum({ items: () => DisputeStatus, default: DisputeStatus.PENDING })
  status: DisputeStatus;

  @ApiProperty({ type: () => Users, required: false })
  @ManyToOne(() => Users, {
    fieldName: 'submitted_by',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  submittedBy: Users;

  @ApiProperty({ type: () => Users, required: false })
  @ManyToOne(() => Users, {
    fieldName: 'submitted_for',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  submittedFor: Users;

  @ApiProperty({ enum: UserType, required: false })
  @Enum({ items: () => UserType, nullable: true })
  userType: UserType;
}
