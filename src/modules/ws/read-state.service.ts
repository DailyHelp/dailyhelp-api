import {
  EntityManager,
  EntityRepository,
  RequestContext,
} from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import {
  ConversationReadState,
  Message,
  MessageReceipt,
} from 'src/entities/message.entity';
import { v4 } from 'uuid';
import { Users } from '../users/users.entity';
import { Conversation } from '../conversations/conversations.entity';

@Injectable()
export class ReadStateService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(MessageReceipt)
    private readonly messageReceiptRepository: EntityRepository<MessageReceipt>,
    @InjectRepository(Message)
    private readonly messageRepository: EntityRepository<Message>,
    @InjectRepository(Users)
    private readonly usersRepository: EntityRepository<Users>,
    @InjectRepository(ConversationReadState)
    private readonly conversationReadStateRepository: EntityRepository<ConversationReadState>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: EntityRepository<Conversation>,
  ) {}

  async markMessageRead(
    userUuid: string,
    messageUuid: string,
    conversationUuid: string,
  ) {
    return RequestContext.create(this.em, async () => {
      let rec = await this.messageReceiptRepository.findOne({
        message: { uuid: messageUuid },
        user: { uuid: userUuid },
      });
      const now = new Date();
      if (!rec) {
        rec = this.messageReceiptRepository.create({
          uuid: v4(),
          message: this.messageRepository.getReference(messageUuid),
          user: this.usersRepository.getReference(userUuid),
          readAt: now,
        });
        this.em.persist(rec);
      }
      await this.em.flush();
    });
  }

  async markConversationRead(userUuid: string, conversationUuid: string) {
    return RequestContext.create(this.em, async () => {
      const now = new Date();
      const conn = this.em.getConnection();

      const unreadIds = await conn
        .execute<{ uuid: string }[]>(
          `
          SELECT m.uuid
          FROM messages m
          LEFT JOIN message_receipts r
            ON r.message = m.uuid
           AND r.\`user\` = ?
          WHERE m.conversation = ?
            AND m.\`to\` = ?
            AND (r.uuid IS NULL OR r.read_at IS NULL)
          `,
          [userUuid, conversationUuid, userUuid],
        )
        .then((rows) => rows.map((r) => r.uuid));

      await conn.execute(
        `
        INSERT INTO message_receipts (uuid, message, \`user\`, read_at, created_at, updated_at)
        SELECT UUID(), m.uuid, ?, ?, NOW(), NOW()
        FROM messages m
        LEFT JOIN message_receipts r
          ON r.message = m.uuid
         AND r.\`user\` = ?
        WHERE m.conversation = ?
          AND m.\`to\` = ?
          AND r.uuid IS NULL
        `,
        [userUuid, now, userUuid, conversationUuid, userUuid],
      );

      await conn.execute(
        `
        UPDATE message_receipts r
        JOIN messages m ON m.uuid = r.message
        SET r.read_at = ?, r.updated_at = NOW()
        WHERE r.\`user\` = ?
          AND m.conversation = ?
          AND m.\`to\` = ?
          AND r.read_at IS NULL
        `,
        [now, userUuid, conversationUuid, userUuid],
      );

      await conn.execute(
        `
        INSERT INTO conversation_read_states (uuid, conversation, \`user\`, last_read_at, unread_count, created_at, updated_at)
        VALUES (?, ?, ?, COALESCE((SELECT MAX(created_at) FROM messages WHERE conversation = ?), ?), 0, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          last_read_at = GREATEST(VALUES(last_read_at), last_read_at),
          unread_count = 0,
          updated_at = NOW()
        `,
        [v4(), conversationUuid, userUuid, conversationUuid, now],
      );

      return {
        conversationUuid,
        readerUuid: userUuid,
        readAt: now.toISOString(),
        messageUuids: unreadIds,
      };
    });
  }
}
