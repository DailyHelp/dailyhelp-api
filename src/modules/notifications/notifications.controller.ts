import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { PaginationQuery } from '../users/users.dto';

@Controller('notifications')
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiQuery({ name: 'pagination[page]', required: false, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: false, type: Number })
  async list(@Query() query: PaginationQuery, @Req() request: Request) {
    return this.notificationsService.listNotifications(
      query.pagination,
      request.user as any,
    );
  }

  @Get('unread-count')
  async unreadCount(@Req() request: Request) {
    return this.notificationsService.unreadCount(request.user as any);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() request: Request) {
    return this.notificationsService.markAllAsRead(request.user as any);
  }

  @Patch(':uuid/read')
  async markAsRead(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.notificationsService.markAsRead(uuid, request.user as any);
  }
}
