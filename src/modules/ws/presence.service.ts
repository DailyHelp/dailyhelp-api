import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS } from './redis.tokens';
import { RedisClientType } from 'redis';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly fallbackPresence = new Map<string, Set<string>>();
  private useFallback = process.env.REDIS_READONLY === 'true';

  constructor(@Inject(REDIS) private readonly redis: RedisClientType) {}

  private key(userUuid: string) {
    return `presence:${userUuid}`;
  }

  private shouldFallback(error: any): boolean {
    const message = (error as Error)?.message || `${error}`;
    if (message?.toUpperCase().includes('READONLY')) {
      this.logger.warn(
        `Redis presence is read-only; falling back to in-memory tracking`,
      );
      return true;
    }
    return false;
  }

  private addFallback(userUuid: string, socketId: string): number {
    const set = this.fallbackPresence.get(userUuid) || new Set<string>();
    set.add(socketId);
    this.fallbackPresence.set(userUuid, set);
    return set.size;
  }

  private removeFallback(userUuid: string, socketId: string): number {
    const set = this.fallbackPresence.get(userUuid) || new Set<string>();
    set.delete(socketId);
    if (set.size === 0) this.fallbackPresence.delete(userUuid);
    else this.fallbackPresence.set(userUuid, set);
    return set.size;
  }

  async addConnection(userUuid: string, socketId: string): Promise<number> {
    if (this.useFallback) {
      return this.addFallback(userUuid, socketId);
    }
    try {
      await this.redis.sAdd(this.key(userUuid), socketId);
      return this.redis.sCard(this.key(userUuid));
    } catch (error) {
      if (this.shouldFallback(error)) {
        this.useFallback = true;
        return this.addFallback(userUuid, socketId);
      }
      throw error;
    }
  }

  async removeConnection(userUuid: string, socketId: string): Promise<number> {
    if (this.useFallback) {
      return this.removeFallback(userUuid, socketId);
    }
    try {
      await this.redis.sRem(this.key(userUuid), socketId);
      return this.redis.sCard(this.key(userUuid));
    } catch (error) {
      if (this.shouldFallback(error)) {
        this.useFallback = true;
        return this.removeFallback(userUuid, socketId);
      }
      throw error;
    }
  }

  async isOnline(userUuid: string): Promise<boolean> {
    if (this.useFallback) {
      return this.fallbackPresence.has(userUuid);
    }
    try {
      const n = await this.redis.sCard(this.key(userUuid));
      return n > 0;
    } catch (error) {
      if (this.shouldFallback(error)) {
        this.useFallback = true;
        return this.fallbackPresence.has(userUuid);
      }
      throw error;
    }
  }

  async isOnlineMany(userUuids: string[]): Promise<Record<string, boolean>> {
    if (!userUuids.length) return {};
    if (this.useFallback) {
      const out: Record<string, boolean> = {};
      for (const id of userUuids) {
        out[id] = this.fallbackPresence.has(id);
      }
      return out;
    }
    try {
      const multi = this.redis.multi();
      for (const id of userUuids) multi.sCard(this.key(id));
      const counts = (await multi.exec()) as unknown as (number | null)[];
      const out: Record<string, boolean> = {};
      userUuids.forEach((id, i) => (out[id] = Number(counts[i] ?? 0) > 0));
      return out;
    } catch (error) {
      if (this.shouldFallback(error)) {
        this.useFallback = true;
        const out: Record<string, boolean> = {};
        for (const id of userUuids) {
          out[id] = this.fallbackPresence.has(id);
        }
        return out;
      }
      throw error;
    }
  }
}
