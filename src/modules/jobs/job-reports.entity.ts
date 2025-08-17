import { Entity, Filter, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Timestamp } from "../../base/timestamp.entity";
import { Job } from "./jobs.entity";
import { Users } from "../users/users.entity";

@Filter({
  name: 'notDeleted',
  cond: { deletedAt: null },
  default: true,
})
@Entity({ tableName: 'job_reports' })
export class JobReport extends Timestamp {
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
  category: string;

  @Property({ type: 'longtext', nullable: true })
  description: string;

  @Property({ type: 'longtext', nullable: true })
  pictures: string;

  @ManyToOne(() => Users, {
    fieldName: 'submitted_by',
    referenceColumnName: 'uuid',
    columnType: 'varchar(255)',
    nullable: true,
  })
  submittedBy: Users;
}
