import { Migration } from '@mikro-orm/migrations';

export class Migration20250610190234_StructuralUpdates extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`job_reviews\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`job\` varchar(255) null, \`rating\` int null, \`review\` varchar(255) null, \`reviewed_by\` varchar(255) null, \`reviewed_for\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`job_reviews\` add index \`job_reviews_job_index\`(\`job\`);`);
    this.addSql(`alter table \`job_reviews\` add index \`job_reviews_reviewed_by_index\`(\`reviewed_by\`);`);
    this.addSql(`alter table \`job_reviews\` add index \`job_reviews_reviewed_for_index\`(\`reviewed_for\`);`);

    this.addSql(`alter table \`job_reviews\` add constraint \`job_reviews_job_foreign\` foreign key (\`job\`) references \`jobs\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`job_reviews\` add constraint \`job_reviews_reviewed_by_foreign\` foreign key (\`reviewed_by\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`job_reviews\` add constraint \`job_reviews_reviewed_for_foreign\` foreign key (\`reviewed_for\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`offers\` add \`current_offer\` varchar(255) null;`);
    this.addSql(`alter table \`offers\` add constraint \`offers_current_offer_foreign\` foreign key (\`current_offer\`) references \`offers\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`offers\` add index \`offers_current_offer_index\`(\`current_offer\`);`);

    this.addSql(`alter table \`users\` add \`engaged\` tinyint(1) not null default false, add \`avg_rating\` int null;`);

    this.addSql(`alter table \`jobs\` drop column \`reviewed_at\`, drop column \`rating\`;`);

    this.addSql(`alter table \`jobs\` add constraint \`jobs_review_foreign\` foreign key (\`review\`) references \`job_reviews\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`jobs\` add index \`jobs_review_index\`(\`review\`);`);

    this.addSql(`alter table \`conversations\` add \`last_message\` varchar(255) null;`);
    this.addSql(`alter table \`conversations\` add constraint \`conversations_last_message_foreign\` foreign key (\`last_message\`) references \`messages\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`conversations\` add index \`conversations_last_message_index\`(\`last_message\`);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`jobs\` drop foreign key \`jobs_review_foreign\`;`);

    this.addSql(`drop table if exists \`job_reviews\`;`);

    this.addSql(`alter table \`offers\` drop foreign key \`offers_current_offer_foreign\`;`);

    this.addSql(`alter table \`conversations\` drop foreign key \`conversations_last_message_foreign\`;`);

    this.addSql(`alter table \`offers\` drop index \`offers_current_offer_index\`;`);
    this.addSql(`alter table \`offers\` drop column \`current_offer\`;`);

    this.addSql(`alter table \`users\` drop column \`engaged\`, drop column \`avg_rating\`;`);

    this.addSql(`alter table \`jobs\` drop index \`jobs_review_index\`;`);

    this.addSql(`alter table \`jobs\` add \`reviewed_at\` datetime null, add \`rating\` int null;`);

    this.addSql(`alter table \`conversations\` drop index \`conversations_last_message_index\`;`);
    this.addSql(`alter table \`conversations\` drop column \`last_message\`;`);
  }

}
