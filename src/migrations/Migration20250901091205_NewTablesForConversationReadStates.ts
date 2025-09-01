import { Migration } from '@mikro-orm/migrations';

export class Migration20250901091205_NewTablesForConversationReadStates extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`message_receipts\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`message\` varchar(255) null, \`user\` varchar(255) null, \`delivered_at\` datetime null, \`read_at\` datetime null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`message_receipts\` add index \`message_receipts_message_index\`(\`message\`);`);
    this.addSql(`alter table \`message_receipts\` add index \`message_receipts_user_index\`(\`user\`);`);

    this.addSql(`create table \`conversation_read_states\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`conversation\` varchar(255) null, \`user\` varchar(255) null, \`last_read_at\` datetime null, \`unread_count\` int not null default 0, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`conversation_read_states\` add index \`conversation_read_states_conversation_index\`(\`conversation\`);`);
    this.addSql(`alter table \`conversation_read_states\` add index \`conversation_read_states_user_index\`(\`user\`);`);

    this.addSql(`alter table \`message_receipts\` add constraint \`message_receipts_message_foreign\` foreign key (\`message\`) references \`messages\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`message_receipts\` add constraint \`message_receipts_user_foreign\` foreign key (\`user\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);

    this.addSql(`alter table \`conversation_read_states\` add constraint \`conversation_read_states_conversation_foreign\` foreign key (\`conversation\`) references \`conversations\` (\`uuid\`) on update cascade on delete set null;`);
    this.addSql(`alter table \`conversation_read_states\` add constraint \`conversation_read_states_user_foreign\` foreign key (\`user\`) references \`users\` (\`uuid\`) on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`message_receipts\`;`);

    this.addSql(`drop table if exists \`conversation_read_states\`;`);
  }

}
