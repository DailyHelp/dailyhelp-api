import { EntityManager } from '@mikro-orm/mysql';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class DatabaseHealthIndicator implements OnModuleInit {
  constructor(private readonly em: EntityManager) {}

  private async healthCheck(count = 5) {
    try {
      await this.em.execute('SELECT 1 + 1');
      console.log('Database connection successful');
    } catch (e) {
      if (count) {
        console.error(`Retrying database connection (${count})...`);
        setTimeout(async () => await this.healthCheck(count - 1), 5000);
      } else {
        console.error('Database connection failed');
        process.exit(1);
      }
    }
  }

  async onModuleInit() {
    await this.healthCheck();
  }
}
