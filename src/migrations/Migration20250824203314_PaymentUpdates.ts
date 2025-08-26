import { Migration } from '@mikro-orm/migrations';

export class Migration20250824203314_PaymentUpdates extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`users\` add \`onboarding_completed\` tinyint(1) not null default false;`);

    this.addSql(`alter table \`payments\` add \`reference\` varchar(255) null, add \`user\` varchar(255) null, add \`offer\` varchar(255) null, add \`conversation\` varchar(255) null, add \`user_type\` enum('PROVIDER', 'CUSTOMER') not null, add \`processed_at\` datetime null;`);
    this.addSql(`alter table \`payments\` add constraint \`payments_user_foreign\` foreign key (\`user\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`payments\` add constraint \`payments_offer_foreign\` foreign key (\`offer\`) references \`offers\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`payments\` add constraint \`payments_conversation_foreign\` foreign key (\`conversation\`) references \`conversations\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`payments\` add index \`payments_user_index\`(\`user\`);`);
    this.addSql(`alter table \`payments\` add index \`payments_offer_index\`(\`offer\`);`);
    this.addSql(`alter table \`payments\` add index \`payments_conversation_index\`(\`conversation\`);`);

    this.addSql(`alter table \`bank_account\` add \`recipient_code\` varchar(255) null;`);

    this.addSql(`alter table \`transactions\` add \`status\` enum('PENDING', 'SUCCESS', 'FAILED') not null default 'SUCCESS';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`payments\` drop foreign key \`payments_user_foreign\`;`);
    this.addSql(`alter table \`payments\` drop foreign key \`payments_offer_foreign\`;`);
    this.addSql(`alter table \`payments\` drop foreign key \`payments_conversation_foreign\`;`);

    this.addSql(`alter table \`payments\` drop index \`payments_user_index\`;`);
    this.addSql(`alter table \`payments\` drop index \`payments_offer_index\`;`);
    this.addSql(`alter table \`payments\` drop index \`payments_conversation_index\`;`);
    this.addSql(`alter table \`payments\` drop column \`reference\`, drop column \`user\`, drop column \`offer\`, drop column \`conversation\`, drop column \`user_type\`, drop column \`processed_at\`;`);

    this.addSql(`alter table \`users\` drop column \`onboarding_completed\`;`);

    this.addSql(`alter table \`bank_account\` drop column \`recipient_code\`;`);

    this.addSql(`alter table \`transactions\` drop column \`status\`;`);
  }

}
