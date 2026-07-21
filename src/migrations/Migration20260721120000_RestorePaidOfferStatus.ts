import { Migration } from '@mikro-orm/migrations';

/**
 * Restores the `PAID` value on `offers.status`.
 *
 * `PAID` was added by Migration20250611200000_AddPaidOfferStatus, but the
 * auto-generated Migration20250722225940_UpdateAndNewEntities was diffed from a
 * stale snapshot that did not contain `PAID`, so its `modify status` statement
 * silently dropped it again. With `PAID` missing from the column enum, every
 * offer settlement (offer.status = PAID) failed with "Data truncated for column
 * 'status'", rolling back the whole webhook charge and leaving paid orders
 * unsettled. This migration puts `PAID` back; the snapshot has been corrected in
 * the same change so future diffs no longer remove it.
 */
export class Migration20260721120000_RestorePaidOfferStatus extends Migration {
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
