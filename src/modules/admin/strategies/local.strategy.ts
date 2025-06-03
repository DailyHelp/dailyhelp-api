import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AdminService } from '../admin.service';

@Injectable()
export class AdminLocalStrategy extends PassportStrategy(
  Strategy,
  'admin-local',
) {
  constructor(private readonly service: AdminService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.service.validateUser(email, password);
    return user;
  }
}
