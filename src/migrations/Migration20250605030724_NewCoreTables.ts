import { Migration } from '@mikro-orm/migrations';

export class Migration20250605030724_NewCoreTables extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`main_categories\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`name\` varchar(255) null, \`icon\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);

    this.addSql(`create table \`offers\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`price\` numeric(10,2) null, \`description\` varchar(255) null, \`pictures\` text null, \`status\` enum('PENDING', 'ACCEPTED', 'DECLINED', 'COUNTERED') not null default 'PENDING', \`declined_reason\` varchar(255) null, \`declined_reason_category\` varchar(255) null, \`counter_reason\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);

    this.addSql(`create table \`sub_categories\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`name\` varchar(255) null, \`main_category\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`sub_categories\` add index \`sub_categories_main_category_index\`(\`main_category\`);`);

    this.addSql(`create table \`reports\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`report_category\` varchar(255) null, \`description\` text null, \`pictures\` text null, \`submitted_by\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`reports\` add index \`reports_submitted_by_index\`(\`submitted_by\`);`);

    this.addSql(`create table \`locations\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`address\` varchar(255) null, \`state\` varchar(255) null, \`lga\` varchar(255) null, \`description\` text null, \`lat\` int null, \`lng\` int null, \`verified\` tinyint(1) not null default false, \`user\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`locations\` add index \`locations_user_index\`(\`user\`);`);

    this.addSql(`create table \`jobs\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`service_provider\` varchar(255) null, \`service_requestor\` varchar(255) null, \`request_id\` varchar(255) null, \`price\` numeric(10,2) null, \`status\` enum('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED') not null default 'PENDING', \`start_date\` datetime null, \`end_date\` datetime null, \`description\` text null, \`pictures\` text null, \`code\` varchar(255) null, \`dispute\` varchar(255) null, \`review\` varchar(255) null, \`reviewed_at\` datetime null, \`rating\` int null, \`accepted_at\` datetime null, \`cancellation_reason\` varchar(255) null, \`cancellation_category\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`jobs\` add index \`jobs_service_provider_index\`(\`service_provider\`);`);
    this.addSql(`alter table \`jobs\` add index \`jobs_service_requestor_index\`(\`service_requestor\`);`);
    this.addSql(`alter table \`jobs\` add index \`jobs_dispute_index\`(\`dispute\`);`);

    this.addSql(`create table \`job_timelines\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`job\` varchar(255) null, \`event\` varchar(255) null, \`actor\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`job_timelines\` add index \`job_timelines_job_index\`(\`job\`);`);
    this.addSql(`alter table \`job_timelines\` add index \`job_timelines_actor_index\`(\`actor\`);`);

    this.addSql(`create table \`job_disputes\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`job\` varchar(255) null, \`category\` varchar(255) null, \`description\` text null, \`pictures\` text null, \`status\` enum('PENDING', 'IN_PROGRESS', 'RESOLVED') not null default 'PENDING', \`submitted_by\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`job_disputes\` add index \`job_disputes_job_index\`(\`job\`);`);
    this.addSql(`alter table \`job_disputes\` add index \`job_disputes_submitted_by_index\`(\`submitted_by\`);`);

    this.addSql(`create table \`conversations\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`service_provider\` varchar(255) null, \`service_requestor\` varchar(255) null, \`last_locked_at\` datetime null, \`locked\` tinyint(1) not null default false, \`restricted\` tinyint(1) not null default true, \`cancellation_chances\` int not null default 3, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`conversations\` add index \`conversations_service_provider_index\`(\`service_provider\`);`);
    this.addSql(`alter table \`conversations\` add index \`conversations_service_requestor_index\`(\`service_requestor\`);`);

    this.addSql(`create table \`messages\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`conversation\` varchar(255) null, \`from\` varchar(255) null, \`to\` varchar(255) null, \`message\` varchar(255) null, \`type\` enum('TEXT', 'OFFER') not null default 'TEXT', \`offer\` varchar(255) null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`messages\` add index \`messages_conversation_index\`(\`conversation\`);`);
    this.addSql(`alter table \`messages\` add index \`messages_from_index\`(\`from\`);`);
    this.addSql(`alter table \`messages\` add index \`messages_to_index\`(\`to\`);`);
    this.addSql(`alter table \`messages\` add index \`messages_offer_index\`(\`offer\`);`);

    this.addSql(`alter table \`sub_categories\` add constraint \`sub_categories_main_category_foreign\` foreign key (\`main_category\`) references \`main_categories\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`reports\` add constraint \`reports_submitted_by_foreign\` foreign key (\`submitted_by\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`locations\` add constraint \`locations_user_foreign\` foreign key (\`user\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`jobs\` add constraint \`jobs_service_provider_foreign\` foreign key (\`service_provider\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`jobs\` add constraint \`jobs_service_requestor_foreign\` foreign key (\`service_requestor\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`jobs\` add constraint \`jobs_dispute_foreign\` foreign key (\`dispute\`) references \`job_disputes\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`job_timelines\` add constraint \`job_timelines_job_foreign\` foreign key (\`job\`) references \`jobs\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`job_timelines\` add constraint \`job_timelines_actor_foreign\` foreign key (\`actor\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`job_disputes\` add constraint \`job_disputes_job_foreign\` foreign key (\`job\`) references \`jobs\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`job_disputes\` add constraint \`job_disputes_submitted_by_foreign\` foreign key (\`submitted_by\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`conversations\` add constraint \`conversations_service_provider_foreign\` foreign key (\`service_provider\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`conversations\` add constraint \`conversations_service_requestor_foreign\` foreign key (\`service_requestor\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`messages\` add constraint \`messages_conversation_foreign\` foreign key (\`conversation\`) references \`conversations\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`messages\` add constraint \`messages_from_foreign\` foreign key (\`from\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`messages\` add constraint \`messages_to_foreign\` foreign key (\`to\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`messages\` add constraint \`messages_offer_foreign\` foreign key (\`offer\`) references \`offers\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`users\` add \`picture\` varchar(255) null, add \`default_location\` varchar(255) null, add \`primary_job_role\` varchar(255) null, add \`service_description\` varchar(255) null, add \`service_images\` varchar(255) null, add \`offer_starting_price\` numeric(10,2) null, add \`minimum_offer_price\` numeric(10,2) null, add \`availability\` tinyint(1) not null default true, add \`tier\` enum('SILVER', 'BRONZE', 'GOLD', 'PLATINUM') not null default 'BRONZE';`);
    this.addSql(`alter table \`users\` add constraint \`users_default_location_foreign\` foreign key (\`default_location\`) references \`locations\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`users\` add constraint \`users_primary_job_role_foreign\` foreign key (\`primary_job_role\`) references \`sub_categories\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`users\` add index \`users_default_location_index\`(\`default_location\`);`);
    this.addSql(`alter table \`users\` add index \`users_primary_job_role_index\`(\`primary_job_role\`);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`sub_categories\` drop foreign key \`sub_categories_main_category_foreign\`;`);

    this.addSql(`alter table \`messages\` drop foreign key \`messages_offer_foreign\`;`);

    this.addSql(`alter table \`users\` drop foreign key \`users_primary_job_role_foreign\`;`);

    this.addSql(`alter table \`users\` drop foreign key \`users_default_location_foreign\`;`);

    this.addSql(`alter table \`job_timelines\` drop foreign key \`job_timelines_job_foreign\`;`);

    this.addSql(`alter table \`job_disputes\` drop foreign key \`job_disputes_job_foreign\`;`);

    this.addSql(`alter table \`jobs\` drop foreign key \`jobs_dispute_foreign\`;`);

    this.addSql(`alter table \`messages\` drop foreign key \`messages_conversation_foreign\`;`);

    this.addSql(`drop table if exists \`main_categories\`;`);

    this.addSql(`drop table if exists \`offers\`;`);

    this.addSql(`drop table if exists \`sub_categories\`;`);

    this.addSql(`drop table if exists \`reports\`;`);

    this.addSql(`drop table if exists \`locations\`;`);

    this.addSql(`drop table if exists \`jobs\`;`);

    this.addSql(`drop table if exists \`job_timelines\`;`);

    this.addSql(`drop table if exists \`job_disputes\`;`);

    this.addSql(`drop table if exists \`conversations\`;`);

    this.addSql(`drop table if exists \`messages\`;`);

    this.addSql(`alter table \`users\` drop index \`users_default_location_index\`;`);
    this.addSql(`alter table \`users\` drop index \`users_primary_job_role_index\`;`);
    this.addSql(`alter table \`users\` drop column \`picture\`, drop column \`default_location\`, drop column \`primary_job_role\`, drop column \`service_description\`, drop column \`service_images\`, drop column \`offer_starting_price\`, drop column \`minimum_offer_price\`, drop column \`availability\`, drop column \`tier\`;`);
  }

}
