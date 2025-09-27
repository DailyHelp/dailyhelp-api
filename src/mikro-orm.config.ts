import { defineConfig, Options } from '@mikro-orm/mysql';
import * as dotenv from 'dotenv';
import { booleanTinyIntTypeCast } from './lib/mysql-type-cast';

dotenv.config();
const config: Options = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 3306,
  user: process.env.DATABASE_USER || 'user',
  password: process.env.DATABASE_PASSWORD || 'user',
  dbName: process.env.DATABASE_NAME || 'dailyhelp',
  entitiesTs: ['./src/**/*.entity.ts', './src/**/*.entities.ts'],
  entities: ['./dist/**/*.entity.js', './src/**/*.entities.js'],
  baseDir: __dirname + '/..',
  migrations: {
    tableName: 'migrations',
    path: './src/migrations',
    transactional: true,
    disableForeignKeys: true,
    allOrNothing: true,
    dropTables: true,
  },
  driverOptions: {
    typeCast: booleanTinyIntTypeCast,
  },
  debug: ['query'],
};

export default defineConfig(config);
