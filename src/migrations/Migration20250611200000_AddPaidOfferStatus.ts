import { Migration } from '@mikro-orm/migrations';

export class Migration20250611200000_AddPaidOfferStatus extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "alter table `offers` modify `status` enum('PENDING', 'CANCELLED', 'ACCEPTED', 'PAID', 'DECLINED', 'COUNTERED') not null default 'PENDING';",
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      "alter table `offers` modify `status` enum('PENDING', 'CANCELLED', 'ACCEPTED', 'DECLINED', 'COUNTERED') not null default 'PENDING';",
    );
  }
}
