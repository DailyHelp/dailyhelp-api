import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtAuthConfig } from 'src/config/types/jwt-auth.config';
import { IAuthContext } from 'src/types';

@Injectable()
export class ExpiredJwtStrategy extends PassportStrategy(
  Strategy,
  'expired-jwt',
) {
  constructor(protected readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: configService.get<JwtAuthConfig>('jwtAuthConfig').secretKey,
    });
  }

  async validate(payload: any): Promise<IAuthContext> {
    return {
      uuid: payload.uuid,
      email: payload.email,
      firstname: payload.firstname,
      lastname: payload.lastname,
      phone: payload.phone,
      userType: payload.userType
    };
  }
}
