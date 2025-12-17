import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { defineConfig, MySqlDriver } from '@mikro-orm/mysql';
import { DatabaseConfigService, DatabaseConfigModule } from './config';
import { DatabaseHealthIndicator } from './database.health-indicator';
import { booleanTinyIntTypeCast } from './lib/mysql-type-cast';

@Module({})
export class DatabaseModule {
  static forRoot() {
    return {
      module: DatabaseModule,
      imports: [
        MikroOrmModule.forRootAsync({
          useFactory: (databaseConfig: DatabaseConfigService) => {
            return defineConfig({
              driver: MySqlDriver,
              host: databaseConfig.host,
              port: databaseConfig.port,
              user: databaseConfig.user,
              password: databaseConfig.password,
              dbName: databaseConfig.name,
              entitiesTs: ['./src/**/*.entity.ts', './src/**/*.entities.ts'],
              entities: ['./dist/**/*.entity.js', './dist/**/*.entities.js'],
              discovery: {
                warnWhenNoEntities: false,
              },
              driverOptions: {
                typeCast: booleanTinyIntTypeCast,
              },
              debug: false,
            });
          },
          imports: [DatabaseConfigModule],
          inject: [DatabaseConfigService],
        }),
      ],
      providers: [DatabaseHealthIndicator],
    };
  }
}
