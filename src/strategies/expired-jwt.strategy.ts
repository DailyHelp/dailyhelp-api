import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtAuthConfig } from 'src/config/types/jwt-auth.config';
import { IAuthContext, UserType } from 'src/types';

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
    const rawUserType = (payload.userType || '') as string;
    const normalizedUserType =
      rawUserType &&
      [UserType.CUSTOMER, UserType.PROVIDER].includes(
        rawUserType.toUpperCase() as UserType,
      )
        ? (rawUserType.toUpperCase() as UserType)
        : (rawUserType as UserType);

    return {
      uuid: payload.uuid,
      email: payload.email,
      firstname: payload.firstname,
      lastname: payload.lastname,
      phone: payload.phone,
      userType: normalizedUserType,
    };
  }
}
