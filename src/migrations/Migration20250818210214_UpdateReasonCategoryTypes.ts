import { Migration } from '@mikro-orm/migrations';

export class Migration20250818210214_UpdateReasonCategoryTypes extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`reason_category\` modify \`type\` enum('CANCEL_JOB_PROVIDER', 'DECLINE_OFFER_PROVIDER', 'CANCEL_OFFER_PROVIDER', 'DISPUTE_PROVIDER', 'REPORT_PROVIDER', 'ACCOUNT_DELETION_PROVIDER', 'CANCEL_JOB_CLIENT', 'CANCEL_OFFER_CLIENT', 'DECLINE_OFFER_CLIENT', 'DISPUTE_CLIENT', 'REPORT_CLIENT', 'ACCOUNT_DELETION_CLIENT');`);

    this.addSql(`alter table \`jobs\` add \`tip\` numeric(10,2) not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`reason_category\` modify \`type\` enum('JOB_PROVIDER', 'OFFER_PROVIDER', 'DISPUTE_PROVIDER', 'REPORT_PROVIDER', 'ACCOUNT_DELETION_PROVIDER', 'JOB_CLIENT', 'OFFER_CLIENT', 'DISPUTE_CLIENT', 'REPORT_CLIENT', 'ACCOUNT_DELETION_CLIENT');`);

    this.addSql(`alter table \`jobs\` drop column \`tip\`;`);
  }

}
