import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { validate } from './env.validator';
import { DatabaseModule } from './database.module';
import { AddCorrelationIdInterceptor } from './lib/add-correlation-id-interceptor';
import { TimeoutInterceptor } from './lib/timeout.interceptor';
import { RequestLoggerMiddleware } from './middleware/request-logger-middleware';
import { SharedModule } from './modules/shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AdminModule } from './modules/admin/admin.module';
import { ListModule } from './modules/lists/lists.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ScheduleModule } from '@nestjs/schedule';
import CronModule from './modules/cron/cron.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot(),
    ScheduleModule.forRoot(),
    SharedModule,
    AuthModule,
    UsersModule,
    AdminModule,
    ListModule,
    WalletModule,
    CronModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AddCorrelationIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
