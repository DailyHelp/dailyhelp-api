import { Migration } from '@mikro-orm/migrations';

export class Migration20250812041257_DBUpdateS extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`job_reports\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`job\` varchar(255) null, \`category\` varchar(255) null, \`description\` longtext null, \`pictures\` longtext null, \`submitted_by\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`job_reports\` add index \`job_reports_job_index\`(\`job\`);`);
    this.addSql(`alter table \`job_reports\` add index \`job_reports_submitted_by_index\`(\`submitted_by\`);`);

    this.addSql(`create table \`bank_account\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`account_number\` varchar(255) null, \`bank_name\` varchar(255) null, \`account_name\` varchar(255) null, \`bank_code\` varchar(255) null, \`user\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`bank_account\` add index \`bank_account_user_index\`(\`user\`);`);

    this.addSql(`alter table \`job_reports\` add constraint \`job_reports_job_foreign\` foreign key (\`job\`) references \`jobs\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`job_reports\` add constraint \`job_reports_submitted_by_foreign\` foreign key (\`submitted_by\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`bank_account\` add constraint \`bank_account_user_foreign\` foreign key (\`user\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`users\` add \`next_tier\` enum('SILVER', 'BRONZE', 'GOLD', 'PLATINUM') not null default 'BRONZE', add \`completed_jobs\` int null default 0, add \`rated_completed_jobs\` int null default 0, add \`progress_to_next_tier\` varchar(255) null;`);

    this.addSql(`alter table \`locations\` modify \`lat\` numeric(10,6), modify \`lng\` numeric(10,6);`);

    this.addSql(`alter table \`jobs\` drop column \`user_type\`;`);

    this.addSql(`alter table \`jobs\` modify \`status\` enum('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELED') not null default 'PENDING';`);

    this.addSql(`alter table \`conversations\` add \`blocked_by\` varchar(255) null;`);
    this.addSql(`alter table \`conversations\` add constraint \`conversations_blocked_by_foreign\` foreign key (\`blocked_by\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`conversations\` add index \`conversations_blocked_by_index\`(\`blocked_by\`);`);

    this.addSql(`alter table \`messages\` modify \`type\` enum('TEXT', 'OFFER', 'OFFER_WITH_TEXT') not null default 'TEXT';`);

    this.addSql(`alter table \`account_deletion_requests\` add \`user_type\` enum('PROVIDER', 'CUSTOMER') null;`);

    this.addSql(`alter table \`transactions\` add \`locked_at\` datetime null, add \`released_at\` datetime null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`job_reports\`;`);

    this.addSql(`drop table if exists \`bank_account\`;`);

    this.addSql(`alter table \`conversations\` drop foreign key \`conversations_blocked_by_foreign\`;`);

    this.addSql(`alter table \`users\` drop column \`next_tier\`, drop column \`completed_jobs\`, drop column \`rated_completed_jobs\`, drop column \`progress_to_next_tier\`;`);

    this.addSql(`alter table \`locations\` modify \`lat\` int, modify \`lng\` int;`);

    this.addSql(`alter table \`jobs\` add \`user_type\` enum('PROVIDER', 'CUSTOMER') null;`);
    this.addSql(`alter table \`jobs\` modify \`status\` enum('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED') not null default 'PENDING';`);

    this.addSql(`alter table \`conversations\` drop index \`conversations_blocked_by_index\`;`);
    this.addSql(`alter table \`conversations\` drop column \`blocked_by\`;`);

    this.addSql(`alter table \`messages\` modify \`type\` enum('TEXT', 'OFFER') not null default 'TEXT';`);

    this.addSql(`alter table \`account_deletion_requests\` drop column \`user_type\`;`);

    this.addSql(`alter table \`transactions\` drop column \`locked_at\`, drop column \`released_at\`;`);
  }

}
