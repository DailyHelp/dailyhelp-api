import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn('REDIS_URL not set; using default in-memory socket adapter');
      return;
    }

    try {
      const pubClient = createClient({ url });
      const subClient = pubClient.duplicate();
      await pubClient.connect();
      await subClient.connect();
      try {
        await pubClient.set('__ws_adapter_healthcheck__', '1', {
          PX: 5000,
        } as any);
      } catch (err) {
        if (`${err?.message}`.toUpperCase().includes('READONLY')) {
          this.logger.error(
            'Redis is read-only; skipping Redis socket adapter and using in-memory instead',
          );
          return;
        }
        throw err;
      }

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Redis socket adapter connected');

      pubClient.on('error', (err) => {
        if (`${err?.message}`.toUpperCase().includes('READONLY')) {
          this.logger.error(
            'Redis is read-only; falling back to in-memory socket adapter for pub/sub',
          );
          this.adapterConstructor = undefined as any;
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to connect Redis socket adapter: ${ (error as Error)?.message || error }`,
      );
      this.adapterConstructor = undefined as any;
    }
  }

  createIOServer(port: number, options?: any) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
