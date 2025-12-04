import { Migration } from '@mikro-orm/migrations';

export class Migration20250926120000_AddProviderIdentityVerifiedToJobs extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `jobs` add `provider_identity_verified` tinyint(1) null;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('alter table `jobs` drop column `provider_identity_verified`;');
  }
}
