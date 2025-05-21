import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlacklistedTokens, Users } from './users.entity';
import { SharedModule } from '../shared/shared.module';
import { UsersController } from './users.controller';
import {
  JwtAuthConfiguration,
  QoreIDConfiguration,
} from 'src/config/configuration';
import { UsersService } from './users.service';
import { JwtStrategy } from 'src/strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forFeature(JwtAuthConfiguration),
    ConfigModule.forFeature(QoreIDConfiguration),
    MikroOrmModule.forFeature({
      entities: [Users, BlacklistedTokens],
    }),
    SharedModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy],
  exports: [UsersService],
})
export class UsersModule {}
