import { Logger, Provider } from '@nestjs/common';
import { REDIS } from './redis.tokens';
import { createClient, RedisClientType } from 'redis';

const logger = new Logger('RedisProvider');

const DEFAULT_CONNECT_TIMEOUT_MS = 5000;

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createInMemoryRedisFallback = (): RedisClientType => {
  const sets = new Map<string, Set<string>>();

  const fallback = {
    async sAdd(key: string, value: string) {
      const set = sets.get(key) ?? new Set<string>();
      const exists = set.has(value);
      set.add(value);
      sets.set(key, set);
      return exists ? 0 : 1;
    },
    async sRem(key: string, value: string) {
      const set = sets.get(key);
      if (!set) return 0;
      const removed = set.delete(value);
      if (set.size === 0) sets.delete(key);
      return removed ? 1 : 0;
    },
    async sCard(key: string) {
      return sets.get(key)?.size ?? 0;
    },
    multi() {
      const ops: Array<() => number> = [];
      const chain = {
        sCard: (key: string) => {
          ops.push(() => sets.get(key)?.size ?? 0);
          return chain;
        },
        exec: async () => ops.map((op) => op()),
      };
      return chain;
    },
  };

  return fallback as unknown as RedisClientType;
};

export const RedisProvider: Provider = {
  provide: REDIS,
  useFactory: async (): Promise<RedisClientType> => {
    const timeoutMs = toNumber(
      process.env.REDIS_CONNECT_TIMEOUT_MS,
      DEFAULT_CONNECT_TIMEOUT_MS,
    );

    if (!process.env.REDIS_URL) {
      logger.warn(
        'REDIS_URL not set; using in-memory presence fallback (single-instance mode)',
      );
      return createInMemoryRedisFallback();
    }

    const client: RedisClientType = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: timeoutMs,
        reconnectStrategy: false,
      },
    });
    client.on('error', (error) => {
      logger.warn(
        `Redis client error (presence fallback may be used): ${(error as Error)?.message || error}`,
      );
    });

    try {
      await client.connect();
      logger.log('Redis presence client connected');
      return client;
    } catch (error) {
      logger.warn(
        `Redis unavailable, using in-memory presence fallback: ${(error as Error)?.message || error}`,
      );
      return createInMemoryRedisFallback();
    }
  },
};
