import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { FirebaseConfiguration } from 'src/config/configuration';
import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Users } from '../users/users.entity';
import { Conversation } from '../conversations/conversations.entity';
import * as fs from 'fs';
import * as path from 'path';

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
  ) {
    this.init();
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
      for (const r of responses) {
        if (r.status === 'fulfilled') success += 1;
        else failure += 1;
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

