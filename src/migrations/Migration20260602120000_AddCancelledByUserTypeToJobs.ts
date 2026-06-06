import { Migration } from '@mikro-orm/migrations';

export class Migration20260602120000_AddCancelledByUserTypeToJobs extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "alter table `jobs` add `cancelled_by_user_type` enum('PROVIDER', 'CUSTOMER') null;",
    );
  }

  override async down(): Promise<void> {
    this.addSql('alter table `jobs` drop column `cancelled_by_user_type`;');
  }
}
