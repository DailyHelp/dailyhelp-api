import { Migration } from '@mikro-orm/migrations';

/**
 * Adds an optional secondary ("side") job role for service providers,
 * mirroring `primary_job_role` — a nullable FK to sub_categories.
 */
export class Migration20260727120000_AddSecondaryJobRole extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `users` add `secondary_job_role` varchar(255) null;',
    );
    this.addSql(
      'alter table `users` add constraint `users_secondary_job_role_foreign` foreign key (`secondary_job_role`) references `sub_categories` (`uuid`) on update cascade on delete set null;',
    );
    this.addSql(
      'alter table `users` add index `users_secondary_job_role_index`(`secondary_job_role`);',
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table `users` drop foreign key `users_secondary_job_role_foreign`;',
    );
    this.addSql(
      'alter table `users` drop index `users_secondary_job_role_index`;',
    );
    this.addSql('alter table `users` drop column `secondary_job_role`;');
  }
}
