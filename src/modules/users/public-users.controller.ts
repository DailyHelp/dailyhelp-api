import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ClientDashboardQuery, PaginationQuery } from './users.dto';

@Controller('users')
@ApiTags('users')
export class PublicUsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('client-dashboard')
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  async fetchClientDashboard(@Query() query: ClientDashboardQuery) {
    return this.userService.fetchClientDashboard(
      query.pagination,
      query.filter,
    );
  }

  @Get(':uuid/reviews')
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  async fetchUserReviews(
    @Param('uuid') uuid: string,
    @Query() query: PaginationQuery,
  ) {
    return this.userService.fetchUserReviews(uuid, query.pagination);
  }
}
