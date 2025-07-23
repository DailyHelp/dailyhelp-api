import { Migration } from '@mikro-orm/migrations';

export class Migration20250722225940_UpdateAndNewEntities extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`payments\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`transaction_id\` varchar(255) null, \`status\` varchar(255) null, \`amount\` numeric(10,2) null, \`channel\` varchar(255) null, \`metadata\` longtext null, \`type\` enum('INCOMING', 'OUTGOING') not null, \`currency\` enum('NGN') not null default 'NGN', primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);

    this.addSql(`create table \`feedbacks\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`user\` varchar(255) null, \`title\` varchar(255) null, \`description\` longtext null, \`user_type\` enum('PROVIDER', 'CUSTOMER') null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`feedbacks\` add index \`feedbacks_user_index\`(\`user\`);`);

    this.addSql(`create table \`account_deletion_requests\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`user\` varchar(255) null, \`reason\` varchar(255) null, \`confirmed_at\` datetime null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`account_deletion_requests\` add index \`account_deletion_requests_user_index\`(\`user\`);`);

    this.addSql(`create table \`wallets\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`total_balance\` numeric(10,2) null, \`available_balance\` numeric(10,2) null, \`user\` varchar(255) null, \`user_type\` enum('PROVIDER', 'CUSTOMER') null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`wallets\` add index \`wallets_user_index\`(\`user\`);`);

    this.addSql(`create table \`transactions\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`type\` enum('credit', 'debit') not null, \`amount\` numeric(10,2) null, \`wallet\` varchar(255) null, \`job\` varchar(255) null, \`payment\` varchar(255) null, \`remark\` varchar(255) null, \`locked\` tinyint(1) not null default true, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`transactions\` add index \`transactions_wallet_index\`(\`wallet\`);`);
    this.addSql(`alter table \`transactions\` add index \`transactions_job_index\`(\`job\`);`);
    this.addSql(`alter table \`transactions\` add index \`transactions_payment_index\`(\`payment\`);`);

    this.addSql(`alter table \`feedbacks\` add constraint \`feedbacks_user_foreign\` foreign key (\`user\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`account_deletion_requests\` add constraint \`account_deletion_requests_user_foreign\` foreign key (\`user\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`wallets\` add constraint \`wallets_user_foreign\` foreign key (\`user\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`transactions\` add constraint \`transactions_wallet_foreign\` foreign key (\`wallet\`) references \`wallets\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`transactions\` add constraint \`transactions_job_foreign\` foreign key (\`job\`) references \`jobs\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`transactions\` add constraint \`transactions_payment_foreign\` foreign key (\`payment\`) references \`payments\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`offers\` add \`cancelled_reason\` varchar(255) null, add \`cancelled_reason_category\` varchar(255) null;`);
    this.addSql(`alter table \`offers\` modify \`pictures\` longtext, modify \`status\` enum('PENDING', 'CANCELLED', 'ACCEPTED', 'DECLINED', 'COUNTERED') not null default 'PENDING';`);

    this.addSql(`alter table \`reason_category\` modify \`type\` enum('JOB_PROVIDER', 'OFFER_PROVIDER', 'DISPUTE_PROVIDER', 'REPORT_PROVIDER', 'ACCOUNT_DELETION_PROVIDER', 'JOB_CLIENT', 'OFFER_CLIENT', 'DISPUTE_CLIENT', 'REPORT_CLIENT', 'ACCOUNT_DELETION_CLIENT');`);

    this.addSql(`alter table \`users\` add \`provider_address\` varchar(255) null, add \`user_types\` varchar(255) null, add \`provider_onboarding\` json null, add \`utility_bill\` varchar(255) null;`);
    this.addSql(`alter table \`users\` modify \`service_description\` longtext, modify \`service_images\` longtext;`);
    this.addSql(`alter table \`users\` add constraint \`users_provider_address_foreign\` foreign key (\`provider_address\`) references \`locations\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`users\` add index \`users_provider_address_index\`(\`provider_address\`);`);

    this.addSql(`alter table \`locations\` add \`user_type\` enum('PROVIDER', 'CUSTOMER') not null;`);
    this.addSql(`alter table \`locations\` modify \`description\` longtext;`);

    this.addSql(`alter table \`jobs\` add \`payment\` varchar(255) null, add \`cancelled_at\` datetime null, add \`user_type\` enum('PROVIDER', 'CUSTOMER') null;`);
    this.addSql(`alter table \`jobs\` modify \`description\` longtext, modify \`pictures\` longtext;`);
    this.addSql(`alter table \`jobs\` add constraint \`jobs_payment_foreign\` foreign key (\`payment\`) references \`payments\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`jobs\` add index \`jobs_payment_index\`(\`payment\`);`);

    this.addSql(`alter table \`job_disputes\` add \`submitted_for\` varchar(255) null, add \`user_type\` enum('PROVIDER', 'CUSTOMER') null;`);
    this.addSql(`alter table \`job_disputes\` modify \`description\` longtext, modify \`pictures\` longtext;`);
    this.addSql(`alter table \`job_disputes\` add constraint \`job_disputes_submitted_for_foreign\` foreign key (\`submitted_for\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`job_disputes\` add index \`job_disputes_submitted_for_index\`(\`submitted_for\`);`);

    this.addSql(`alter table \`conversations\` add \`blocked\` tinyint(1) not null default false;`);

    this.addSql(`alter table \`reports\` add \`conversation\` varchar(255) null;`);
    this.addSql(`alter table \`reports\` modify \`description\` longtext, modify \`pictures\` longtext;`);
    this.addSql(`alter table \`reports\` add constraint \`reports_conversation_foreign\` foreign key (\`conversation\`) references \`conversations\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`reports\` add index \`reports_conversation_index\`(\`conversation\`);`);

    this.addSql(`alter table \`messages\` add \`status\` enum('SENT', 'DELIVERED', 'SEEN') not null default 'SENT';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`jobs\` drop foreign key \`jobs_payment_foreign\`;`);

    this.addSql(`alter table \`transactions\` drop foreign key \`transactions_payment_foreign\`;`);

    this.addSql(`alter table \`transactions\` drop foreign key \`transactions_wallet_foreign\`;`);

    this.addSql(`drop table if exists \`payments\`;`);

    this.addSql(`drop table if exists \`feedbacks\`;`);

    this.addSql(`drop table if exists \`account_deletion_requests\`;`);

    this.addSql(`drop table if exists \`wallets\`;`);

    this.addSql(`drop table if exists \`transactions\`;`);

    this.addSql(`alter table \`users\` drop foreign key \`users_provider_address_foreign\`;`);

    this.addSql(`alter table \`reports\` drop foreign key \`reports_conversation_foreign\`;`);

    this.addSql(`alter table \`job_disputes\` drop foreign key \`job_disputes_submitted_for_foreign\`;`);

    this.addSql(`alter table \`offers\` drop column \`cancelled_reason\`, drop column \`cancelled_reason_category\`;`);

    this.addSql(`alter table \`offers\` modify \`pictures\` text, modify \`status\` enum('PENDING', 'ACCEPTED', 'DECLINED', 'COUNTERED') not null default 'PENDING';`);

    this.addSql(`alter table \`reason_category\` modify \`type\` enum('JOB_PROVIDER', 'OFFER_PROVIDER', 'DISPUTE_PROVIDER', 'REPORT_PROVIDER', 'JOB_CLIENT', 'OFFER_CLIENT', 'DISPUTE_CLIENT', 'REPORT_CLIENT');`);

    this.addSql(`alter table \`users\` drop index \`users_provider_address_index\`;`);
    this.addSql(`alter table \`users\` drop column \`provider_address\`, drop column \`user_types\`, drop column \`provider_onboarding\`, drop column \`utility_bill\`;`);

    this.addSql(`alter table \`users\` modify \`service_description\` varchar(255), modify \`service_images\` varchar(255);`);

    this.addSql(`alter table \`reports\` drop index \`reports_conversation_index\`;`);
    this.addSql(`alter table \`reports\` drop column \`conversation\`;`);

    this.addSql(`alter table \`reports\` modify \`description\` text, modify \`pictures\` text;`);

    this.addSql(`alter table \`locations\` drop column \`user_type\`;`);

    this.addSql(`alter table \`locations\` modify \`description\` text;`);

    this.addSql(`alter table \`jobs\` drop index \`jobs_payment_index\`;`);
    this.addSql(`alter table \`jobs\` drop column \`payment\`, drop column \`cancelled_at\`, drop column \`user_type\`;`);

    this.addSql(`alter table \`jobs\` modify \`description\` text, modify \`pictures\` text;`);

    this.addSql(`alter table \`job_disputes\` drop index \`job_disputes_submitted_for_index\`;`);
    this.addSql(`alter table \`job_disputes\` drop column \`submitted_for\`, drop column \`user_type\`;`);

    this.addSql(`alter table \`job_disputes\` modify \`description\` text, modify \`pictures\` text;`);

    this.addSql(`alter table \`conversations\` drop column \`blocked\`;`);

    this.addSql(`alter table \`messages\` drop column \`status\`;`);
  }

}
