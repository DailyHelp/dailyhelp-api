import { Migration } from '@mikro-orm/migrations';

/**
 * Adds support for image messages in chat:
 * - `messages.images` (longtext) holds a comma-separated list of image URLs.
 * - `messages.type` enum gains the `IMAGE` value.
 *
 * The enum is altered additively (all existing values preserved) to avoid the
 * data-truncation problem seen previously with stale-snapshot enum drift.
 */
export class Migration20260726120000_AddImageMessages extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "alter table `messages` add column `images` longtext null;",
    );
    this.addSql(
      "alter table `messages` modify `type` enum('TEXT', 'OFFER', 'OFFER_WITH_TEXT', 'IMAGE') not null default 'TEXT';",
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      "alter table `messages` modify `type` enum('TEXT', 'OFFER', 'OFFER_WITH_TEXT') not null default 'TEXT';",
    );
    this.addSql('alter table `messages` drop column `images`;');
  }
}
