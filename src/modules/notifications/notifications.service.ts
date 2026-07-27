import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { FirebaseConfiguration } from 'src/config/configuration';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Users } from '../users/users.entity';
import { Conversation } from '../conversations/conversations.entity';
import { Notification } from '../../entities/notification.entity';
import { PaginationInput } from 'src/base/dto';
import { IAuthContext } from 'src/types';
import { buildResponseDataWithPagination } from 'src/utils';
import { v4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export type NotificationInput = {
  recipientUuid: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
  // When true, also send a push notification for this record.
  push?: boolean;
};

// Lazy import to avoid hard crash if firebase-admin isn't installed yet
let admin: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  admin = require('firebase-admin');
} catch (e) {
  admin = null;
}

type PushPayload = {
  title?: string;
  body?: string;
  data?: Record<string, string>;
  silent?: boolean;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private initialized = false;

  constructor(
    @Inject(FirebaseConfiguration.KEY)
    private readonly fbConfig: ConfigType<typeof FirebaseConfiguration>,
    @InjectRepository(Users)
    private readonly usersRepo: EntityRepository<Users>,
    @InjectRepository(Conversation)
    private readonly convRepo: EntityRepository<Conversation>,
    @InjectRepository(Notification)
    private readonly notificationRepo: EntityRepository<Notification>,
    private readonly em: EntityManager,
  ) {
    this.init();
  }

  /**
   * Persist an in-app notification for a recipient (and optionally push it).
   * Called from domain services right after their own flush, so it never
   * blocks or rolls back the primary operation. Failures are swallowed and
   * logged — a notification must never break the action that triggered it.
   */
  async record(input: NotificationInput | NotificationInput[]) {
    const inputs = Array.isArray(input) ? input : [input];
    try {
      for (const n of inputs) {
        if (!n.recipientUuid) continue;
        const model = this.notificationRepo.create({
          uuid: v4(),
          recipient: this.usersRepo.getReference(n.recipientUuid),
          type: n.type,
          title: n.title,
          body: n.body ?? null,
          data: n.data ? JSON.stringify(n.data) : null,
          readAt: null,
        });
        this.em.persist(model);
      }
      await this.em.flush();
    } catch (err) {
      this.logger.error(
        `Failed to persist notification(s): ${(err as any)?.message ?? err}`,
      );
    }
    // Fire pushes for any inputs that opted in (best-effort, non-blocking).
    for (const n of inputs) {
      if (n.push) {
        void this.sendToUserUuids([n.recipientUuid], {
          title: n.title,
          body: n.body,
          data: {
            type: n.type,
            ...(n.data
              ? Object.fromEntries(
                  Object.entries(n.data).map(([k, v]) => [k, String(v)]),
                )
              : {}),
          },
        }).catch(() => undefined);
      }
    }
  }

  async listNotifications(
    pagination: PaginationInput,
    { uuid }: IAuthContext,
  ) {
    const page = Math.max(1, Number(pagination?.page) || 1);
    const limit = Math.max(1, Number(pagination?.limit) || 20);
    const offset = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      this.notificationRepo.find(
        { recipient: { uuid } },
        { limit, offset, orderBy: { createdAt: 'DESC' } },
      ),
      this.notificationRepo.count({ recipient: { uuid } }),
    ]);
    const data = rows.map((n) => ({
      uuid: n.uuid,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data ? JSON.parse(n.data) : null,
      read: !!n.readAt,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));
    return buildResponseDataWithPagination(data, total, { page, limit });
  }

  async unreadCount({ uuid }: IAuthContext) {
    const count = await this.notificationRepo.count({
      recipient: { uuid },
      readAt: null,
    });
    return { status: true, data: { count } };
  }

  async markAsRead(notificationUuid: string, { uuid }: IAuthContext) {
    const notification = await this.notificationRepo.findOne({
      uuid: notificationUuid,
      recipient: { uuid },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.em.flush();
    }
    return { status: true };
  }

  async markAllAsRead({ uuid }: IAuthContext) {
    await this.notificationRepo.nativeUpdate(
      { recipient: { uuid }, readAt: null },
      { readAt: new Date() },
    );
    return { status: true };
  }

  private init() {
    if (!admin) {
      this.logger.warn('firebase-admin not installed; push notifications disabled');
      return;
    }

    if (this.initialized) return;

    try {
      const { serviceAccountPath, databaseUrl, projectId, clientEmail, privateKey } = this.fbConfig || {};
      let credential: any;
      if (serviceAccountPath) {
        const resolved = path.resolve(serviceAccountPath);
        const svc = JSON.parse(fs.readFileSync(resolved, 'utf8'));
        credential = admin.credential.cert(svc);
      } else if (projectId && clientEmail && privateKey) {
        const key = privateKey.replace(/\\n/g, '\n');
        credential = admin.credential.cert({ projectId, clientEmail, privateKey: key });
      }

      if (!credential) {
        this.logger.warn('Firebase config not provided; push notifications disabled');
        return;
      }

      if (!admin.apps || admin.apps.length === 0) {
        admin.initializeApp({ credential, databaseURL: databaseUrl });
      }
      this.initialized = true;
      this.logger.log('Firebase Admin initialized for push notifications');
    } catch (err: any) {
      this.logger.error(`Failed to init Firebase Admin: ${err?.message || err}`);
    }
  }

  private isEnabled() {
    return !!(admin && this.initialized);
  }

  private buildMessage(token: string, payload: PushPayload) {
    const { title, body, data, silent } = payload || {};
    const msg: any = {
      token,
      android: { priority: 'high', ttl: 60 },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default', contentAvailable: true } },
      },
      data: { ...(data || {}), silent: silent ? '1' : '0' },
    };
    if (!silent && (title || body)) {
      msg.notification = { title, body };
    }
    return msg;
  }

  private chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  async sendToUserUuids(userUuids: string[], payload: PushPayload, excludeUuid?: string) {
    if (!this.isEnabled()) return { skipped: true };
    if (!userUuids || userUuids.length === 0) return { skipped: true };

    const distinct = Array.from(new Set(userUuids.filter(Boolean)));
    const users = await this.usersRepo.find(
      { uuid: { $in: distinct.filter((u) => u !== excludeUuid) as any } },
      { fields: ['uuid', 'deviceToken'] as any },
    );
    const tokens = users.map((u) => u.deviceToken).filter(Boolean) as string[];
    if (tokens.length === 0) return { sent: 0 };

    const chunks = this.chunk(tokens, 500);
    let success = 0;
    let failure = 0;
    for (const c of chunks) {
      const responses = await Promise.allSettled(
        c.map((t) => admin.messaging().send(this.buildMessage(t, payload))),
      );
      const invalidTokens: string[] = [];
      responses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          success += 1;
          return;
        }
        failure += 1;
        const token = c[index];
        const reason = result.reason;
        const message = reason?.message || reason;
        const stack = reason?.stack;
        this.logger.error(
          `Push token ${token} failed → ${message}`,
          stack || (typeof reason === 'string' ? reason : undefined),
        );
        // Auto-clear tokens FCM explicitly rejects as invalid
        const invalidTokenErrors = [
          'registration-token-not-registered',
          'invalid-registration-token',
          'invalid-argument',
        ];
        if (invalidTokenErrors.some((e) => reason?.code?.includes(e) || message?.toLowerCase().includes('not a valid fcm'))) {
          invalidTokens.push(token);
        }
      });
      if (invalidTokens.length > 0) {
        await this.usersRepo.nativeUpdate(
          { deviceToken: { $in: invalidTokens } },
          { deviceToken: null },
        );
        this.logger.log(`Cleared ${invalidTokens.length} invalid device token(s) from DB`);
      }
    }
    this.logger.log(`Push sent → success=${success}, failure=${failure}`);
    return { success, failure };
  }

  async notifyConversationParticipants(
    conversationUuid: string,
    payload: PushPayload,
    excludeUuid?: string,
  ) {
    if (!this.isEnabled()) return { skipped: true };
    const conv = await this.convRepo.findOne(
      { uuid: conversationUuid },
      { populate: ['serviceProvider', 'serviceRequestor'] },
    );
    if (!conv) return { skipped: true };
    const uuids = [conv.serviceProvider?.uuid, conv.serviceRequestor?.uuid].filter(
      Boolean,
    ) as string[];
    return this.sendToUserUuids(uuids, payload, excludeUuid);
  }
}
