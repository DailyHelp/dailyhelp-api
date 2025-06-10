import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import {
  AdminUser,
  MainCategory,
  ReasonCategory,
  SubCategory,
} from './admin.entities';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import { JwtAuthConfiguration } from 'src/config/configuration';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthConfig } from 'src/config/types/jwt-auth.config';
import { AdminService } from './admin.service';
import { AdminLocalStrategy } from './strategies/local.strategy';
import { AdminJwtStrategy } from './strategies/jwt.strategy';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [AdminUser, MainCategory, SubCategory, ReasonCategory],
    }),
    PassportModule,
    ConfigModule.forFeature(JwtAuthConfiguration),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(JwtAuthConfiguration)],
      useFactory: (jwtAuthConfig: ConfigType<typeof JwtAuthConfiguration>) => ({
        secret: jwtAuthConfig.adminSecretKey,
        signOptions: { expiresIn: '1h' },
      }),
      inject: [JwtAuthConfiguration.KEY],
    }),
  ],
  providers: [AdminService, AdminLocalStrategy, AdminJwtStrategy],
  controllers: [AdminController],
})
export class AdminModule {}
