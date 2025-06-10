import { Entity, Filter, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Timestamp } from "../base/timestamp.entity";
import { Job } from "../modules/jobs/jobs.entity";
import { Users } from "../modules/users/users.entity";

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'job_reviews' })
export class JobReview extends Timestamp {
  @PrimaryKey()
  uuid: string;

  @ManyToOne(() => Job, {
    fieldName: 'job',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  job: Job;

  @Property({ nullable: true })
  rating: number;

  @Property({ nullable: true })
  review: string;

  @ManyToOne(() => Users, {
    fieldName: 'reviewed_by',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  reviewedBy: Users;

  @ManyToOne(() => Users, {
    fieldName: 'reviewed_for',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  reviewedFor: Users;
}