import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { Request } from 'express';
import { ADMIN_PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AdminUser } from '../admin.entities';
import { IAdminAuthContext } from 'src/types';

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: EntityRepository<AdminUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowUnauthorizedRequest = this.reflector.getAllAndOverride<boolean>(
      'allowUnauthorizedRequest',
      [context.getHandler(), context.getClass()],
    );
    if (allowUnauthorizedRequest) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      ADMIN_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const adminContext = request.user as IAdminAuthContext | undefined;
    if (!adminContext?.uuid) {
      throw new UnauthorizedException('Admin authentication required');
    }

    const admin = await this.adminUserRepository.findOne(
      { uuid: adminContext.uuid, deletedAt: null } as any,
      { populate: ['roles', 'roles.permissions'] },
    );
    if (!admin) {
      throw new UnauthorizedException('Admin user not found');
    }

    const permissionSet = new Set<string>();
    const roles = admin.roles.getItems();
    roles.forEach((role) => {
      role.permissions.getItems().forEach((permission) => {
        permissionSet.add(permission.code);
      });
    });

    const hasAllPermissions = requiredPermissions.every((permission) =>
      permissionSet.has(permission),
    );
    if (!hasAllPermissions) {
      throw new ForbiddenException('You are not permitted to perform this action');
    }

    request.user = {
      ...adminContext,
      name: admin.fullname,
      firstName: admin.firstName,
      lastName: admin.lastName,
      roles: roles.map((role) => role.name),
      permissions: Array.from(permissionSet),
    };

    return true;
  }
}
