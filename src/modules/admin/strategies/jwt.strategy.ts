import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtAuthConfig } from 'src/config/types/jwt-auth.config';
import { IAdminAuthContext } from 'src/types';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(protected readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<JwtAuthConfig>('jwtAuthConfig').adminSecretKey,
    });
  }

  async validate(payload: IAdminAuthContext) {
    return payload;
  }
}
