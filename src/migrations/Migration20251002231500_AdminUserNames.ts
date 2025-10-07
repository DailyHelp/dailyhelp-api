import { Migration } from '@mikro-orm/migrations';

export class Migration20251002231500_AdminUserNames extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`admin_users\` add \`first_name\` varchar(150) null after \`fullname\`, add \`last_name\` varchar(150) null after \`first_name\`;`);
    this.addSql(`update \`admin_users\` set \`first_name\` = \`fullname\` where \`first_name\` is null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`admin_users\` drop column \`first_name\`, drop column \`last_name\`;`);
  }

}
