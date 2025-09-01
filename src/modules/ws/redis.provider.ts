import { Provider } from '@nestjs/common';
import { REDIS } from './redis.tokens';
import { createClient, RedisClientType } from 'redis';

export const RedisProvider: Provider = {
  provide: REDIS,
  useFactory: async (): Promise<RedisClientType> => {
    const client: RedisClientType = createClient({
      url: process.env.REDIS_URL,
    });
    await client.connect();
    return client;
  },
};
