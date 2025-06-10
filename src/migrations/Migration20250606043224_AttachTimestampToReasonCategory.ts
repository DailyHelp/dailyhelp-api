import { Migration } from '@mikro-orm/migrations';

export class Migration20250606043224_AttachTimestampToReasonCategory extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`reason_category\` add \`created_at\` datetime not null default CURRENT_TIMESTAMP, add \`updated_at\` datetime not null default CURRENT_TIMESTAMP, add \`deleted_at\` datetime null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`reason_category\` drop column \`created_at\`, drop column \`updated_at\`, drop column \`deleted_at\`;`);
  }

}
