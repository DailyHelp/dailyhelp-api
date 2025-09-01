import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtAuthConfiguration } from 'src/config/configuration';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    @Inject(JwtAuthConfiguration.KEY)
    protected readonly jwtAuthConfig: ConfigType<typeof JwtAuthConfiguration>,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const client: any = ctx.switchToWs().getClient();
    const token =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException(`Missing token`);
    try {
      const payload = jwt.verify(token, this.jwtAuthConfig.secretKey) as any;
      client.user = {
        uuid: payload.uuid,
        userType: payload.userType,
        email: payload.email,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
