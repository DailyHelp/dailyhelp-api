import { Migration } from '@mikro-orm/migrations';

export class Migration20250521152848_InitialMigration extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`blacklisted_tokens\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`token\` longtext null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);

    this.addSql(`create table \`notification_templates\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`code\` varchar(255) not null, \`body\` longtext not null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`notification_templates\` add unique \`notification_templates_code_unique\`(\`code\`);`);

    this.addSql(`create table \`otp\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`otp\` varchar(6) not null, \`pin_id\` varchar(255) not null, \`expired_at\` datetime null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);

    this.addSql(`create table \`users\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`firstname\` varchar(255) null, \`middlename\` varchar(255) null, \`dob\` varchar(255) null, \`gender\` varchar(255) null, \`lastname\` varchar(255) null, \`email\` varchar(255) null, \`phone\` varchar(255) null, \`password\` varchar(255) null, \`email_verified\` tinyint(1) not null default false, \`phone_verified\` tinyint(1) not null default false, \`identity_verified\` tinyint(1) not null default false, \`last_logged_in\` datetime null, \`nin\` varchar(255) null, \`bvn\` varchar(255) null, \`device_token\` varchar(255) null, \`nin_data\` json null, \`bvn_data\` json null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`blacklisted_tokens\`;`);

    this.addSql(`drop table if exists \`notification_templates\`;`);

    this.addSql(`drop table if exists \`otp\`;`);

    this.addSql(`drop table if exists \`users\`;`);
  }

}
