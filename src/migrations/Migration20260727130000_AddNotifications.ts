import { Migration } from '@mikro-orm/migrations';

/**
 * Creates the `notifications` table backing the in-app notification history.
 */
export class Migration20260727130000_AddNotifications extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "create table `notifications` (`uuid` varchar(255) not null, `created_at` datetime not null default CURRENT_TIMESTAMP, `updated_at` datetime not null default CURRENT_TIMESTAMP, `deleted_at` datetime null, `recipient` varchar(255) null, `type` varchar(255) not null, `title` varchar(255) null, `body` longtext null, `data` longtext null, `read_at` datetime null, primary key (`uuid`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      'alter table `notifications` add index `notifications_recipient_index`(`recipient`);',
    );
    this.addSql(
      'alter table `notifications` add constraint `notifications_recipient_foreign` foreign key (`recipient`) references `users` (`uuid`) on update cascade on delete set null;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists `notifications`;');
  }
}
