import { Migration } from '@mikro-orm/migrations';

export class Migration20251018120000_AdminUserTemporaryPasswordFlag extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `admin_users` add `is_temporary_password` tinyint(1) not null default 0;'
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table `admin_users` drop column `is_temporary_password`;'
    );
  }
}
