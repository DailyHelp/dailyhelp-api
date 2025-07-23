import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ClientDashboardQuery, PaginationQuery } from './users.dto';

@Controller('users')
@ApiTags('users')
export class PublicUsersController {
  constructor(private readonly userService: UsersService) {}
}
