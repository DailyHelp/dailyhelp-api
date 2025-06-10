import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { Request } from 'express';
import { IAuthContext } from 'src/types';
import { Users } from './users.entity';
import {
  ClientDashboardQuery,
  PaginationQuery,
  SaveLocationDto,
  SavePricesDto,
  SendOfferDto,
  VerifyIdentityDto,
} from './users.dto';
import { Location } from 'src/entities/location.entity';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get()
  @ApiOkResponse({
    type: Users,
    description: 'User info fetched successfully',
  })
  async getUserInfo(@Req() request: Request) {
    return this.userService.findByEmailOrPhone(
      (request.user as IAuthContext).email,
    );
  }

  @Post('verify-identity')
  verifyIdentity(@Body() body: VerifyIdentityDto, @Req() request: Request) {
    return this.userService.verifyIdentity(body, request.user as any);
  }

  @Post('save-location')
  saveLocation(@Body() body: SaveLocationDto, @Req() request: Request) {
    return this.userService.saveLocation(body, request.user as any);
  }

  @Get('locations')
  @ApiOkResponse({
    type: Location,
    isArray: true,
    description: 'User locations fetched successfully',
  })
  fetchLocations(@Req() request: Request) {
    return this.userService.fetchLocations(request.user as any);
  }

  @Post('location/:uuid/delete')
  deleteLocation(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.userService.deleteLocation(uuid, request.user as any);
  }

  @Post('save-prices')
  async savePrices(@Body() body: SavePricesDto, @Req() request: Request) {
    return this.userService.savePrices(body, request.user as any);
  }

  @Post(':uuid/send-offer')
  async sendOffer(
    @Param('uuid') uuid: string,
    @Body() body: SendOfferDto,
    @Req() request: Request,
  ) {
    return this.userService.sendOffer(uuid, body, request.user as any);
  }

  @Get('conversations')
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  async fetchUserConversations(
    @Query() query: PaginationQuery,
    @Query('search') search: string,
    @Req() request: Request,
  ) {
    return this.userService.fetchUserConversations(
      query.pagination,
      request.user as any,
      search,
    );
  }
}
