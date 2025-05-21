import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtAuthConfiguration } from 'src/config/configuration';
import { BlacklistedTokens } from 'src/modules/users/users.entity';
import { IAuthContext } from 'src/types';
import { PassportStrategy } from '@nestjs/passport';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(JwtAuthConfiguration.KEY)
    protected readonly jwtAuthConfig: ConfigType<typeof JwtAuthConfiguration>,
    @InjectRepository(BlacklistedTokens)
    private readonly blacklistedTokensRepository: EntityRepository<BlacklistedTokens>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtAuthConfig.secretKey,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any): Promise<IAuthContext> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const blacklisted = await this.blacklistedTokensRepository.findOne({
      token,
    });
    if (blacklisted) throw new UnauthorizedException('Invalid token');
    return {
      uuid: payload.uuid,
      email: payload.email,
      firstname: payload.firstname,
      lastname: payload.lastname,
      phone: payload.phone,
    };
  }
}
