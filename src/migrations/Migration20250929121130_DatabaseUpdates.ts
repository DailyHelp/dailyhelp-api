import { Migration } from '@mikro-orm/migrations';

export class Migration20250929121130_DatabaseUpdates extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`users\` add \`suspended\` tinyint(1) not null default false, add \`suspension_reason\` varchar(255) null;`);

    this.addSql(`alter table \`reports\` add \`status\` enum('PENDING', 'RESOLVED') not null default 'PENDING', add \`resolution_note\` varchar(255) null, add \`resolved_at\` datetime null, add \`resolved_by\` varchar(255) null;`);

    this.addSql(`alter table \`job_disputes\` add \`code\` varchar(255) null, add \`resolution_action\` enum('REFUND_REQUESTOR', 'PARTIAL_REFUND', 'PAY_PROVIDER') null, add \`resolution_note\` varchar(255) null, add \`resolution_refund_amount\` numeric(10,2) null, add \`resolution_provider_amount\` numeric(10,2) null, add \`resolution_commission_amount\` numeric(10,2) null, add \`resolved_at\` datetime null, add \`resolved_by\` varchar(255) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`users\` drop column \`suspended\`, drop column \`suspension_reason\`;`);

    this.addSql(`alter table \`reports\` drop column \`status\`, drop column \`resolution_note\`, drop column \`resolved_at\`, drop column \`resolved_by\`;`);

    this.addSql(`alter table \`job_disputes\` drop column \`code\`, drop column \`resolution_action\`, drop column \`resolution_note\`, drop column \`resolution_refund_amount\`, drop column \`resolution_provider_amount\`, drop column \`resolution_commission_amount\`, drop column \`resolved_at\`, drop column \`resolved_by\`;`);
  }

}
