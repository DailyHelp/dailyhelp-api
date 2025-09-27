import {
  Entity,
  Enum,
  Filter,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Timestamp } from '../../base/timestamp.entity';
import { DisputeResolutionAction, DisputeStatus, UserType } from '../../types';
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

  @ApiProperty({ enum: DisputeResolutionAction, required: false })
  @Enum({ items: () => DisputeResolutionAction, nullable: true })
  resolutionAction?: DisputeResolutionAction;

  @Property({ nullable: true })
  resolutionNote?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  resolutionRefundAmount?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  resolutionProviderAmount?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  resolutionCommissionAmount?: number;

  @Property({ nullable: true })
  resolvedAt?: Date;

  @Property({ nullable: true })
  resolvedBy?: string;
}
