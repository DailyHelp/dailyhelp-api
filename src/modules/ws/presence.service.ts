import { Inject, Injectable } from '@nestjs/common';
import { REDIS } from './redis.tokens';
import { RedisClientType } from 'redis';

@Injectable()
export class PresenceService {
  constructor(@Inject(REDIS) private readonly redis: RedisClientType) {}

  private key(userUuid: string) {
    return `presence:${userUuid}`;
  }

  async addConnection(userUuid: string, socketId: string): Promise<number> {
    await this.redis.sAdd(this.key(userUuid), socketId);
    return this.redis.sCard(this.key(userUuid));
  }

  async removeConnection(userUuid: string, socketId: string): Promise<number> {
    await this.redis.sRem(this.key(userUuid), socketId);
    return this.redis.sCard(this.key(userUuid));
  }

  async isOnline(userUuid: string): Promise<boolean> {
    const n = await this.redis.sCard(this.key(userUuid));
    return n > 0;
  }

  async isOnlineMany(userUuids: string[]): Promise<Record<string, boolean>> {
    if (!userUuids.length) return {};
    const multi = this.redis.multi();
    for (const id of userUuids) multi.sCard(this.key(id));
    const counts = (await multi.exec()) as unknown as (number | null)[];
    const out: Record<string, boolean> = {};
    userUuids.forEach((id, i) => (out[id] = Number(counts[i] ?? 0) > 0));
    return out;
  }
}
