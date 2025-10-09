import { Migration } from '@mikro-orm/migrations';

export class Migration20250201120000_SettingsEnhancements extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table \`account_tier_settings\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`tier\` varchar(255) not null, \`label\` varchar(255) null, \`level_label\` varchar(255) null, \`description\` varchar(255) null, \`min_jobs\` int not null default 0, \`min_avg_rating\` decimal(5,2) not null default 0, \`display_order\` int not null default 0, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`create unique index \`account_tier_settings_tier_unique\` on \`account_tier_settings\` (\`tier\`);`);

    this.addSql(`create table \`job_tips\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`title\` varchar(255) not null, \`description\` longtext null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);

    this.addSql(`insert into \`account_tier_settings\` (\`uuid\`, \`created_at\`, \`updated_at\`, \`tier\`, \`label\`, \`level_label\`, \`description\`, \`min_jobs\`, \`min_avg_rating\`, \`display_order\`) values
      ('1b02f2e4-4a43-4c25-9a35-2d1f5f7c4a01', now(), now(), 'BRONZE', 'Bronze rated', 'Starter level', null, 0, 0, 1),
      ('2c8f3b58-19d8-4b97-b60c-3b8b57d7f102', now(), now(), 'SILVER', 'Silver rated', 'Skilled level', null, 15, 3, 2),
      ('3fd4b6d1-7a2e-4fbb-9d61-4ac90b52f903', now(), now(), 'GOLD', 'Gold rated', 'Experienced level', null, 50, 4, 3),
      ('4a93c7e2-2f74-4a42-a81c-a54eb93a8f04', now(), now(), 'PLATINUM', 'Platinum rated', 'Elite level', null, 200, 5, 4);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`job_tips\`;`);
    this.addSql(`drop table if exists \`account_tier_settings\`;`);
  }
}
