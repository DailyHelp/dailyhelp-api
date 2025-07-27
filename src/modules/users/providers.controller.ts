import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { UsersService } from './users.service';
import { Users } from './users.entity';
import { IAuthContext } from 'src/types';
import { Request } from 'express';
import {
  ConfirmDeletionRequestDto,
  CreateDeletionRequestDto,
  DisputeQuery,
  FeedbackDto,
  ProvidersDashboardDto,
  SaveLocationDto,
  SavePricesDto,
  SaveProviderDetails,
  SwitchUserType,
  VerifyIdentityDto,
} from './users.dto';
import { Location } from 'src/entities/location.entity';

@Controller('providers')
@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProvidersController {
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

  @Get('dashboard')
  @ApiOkResponse({
    type: ProvidersDashboardDto,
    description: 'Provider dashboard fetched successfully',
  })
  async fetchProviderDashboard(@Req() req: Request) {
    return this.userService.fetchProviderDashboard(req.user as any);
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
  fetchLocations(
    @Query('defaultOnly') defaultOnly: string,
    @Req() request: Request,
  ) {
    return this.userService.fetchLocations(defaultOnly, request.user as any);
  }

  @Patch('location/:uuid/set-default')
  setLocationAsDefault(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.userService.setLocationAsDefault(uuid, request.user as any);
  }

  @Delete('location/:uuid/delete')
  deleteLocation(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.userService.deleteLocation(uuid, request.user as any);
  }

  @Post('save-prices')
  async savePrices(@Body() body: SavePricesDto, @Req() request: Request) {
    return this.userService.savePrices(body, request.user as any);
  }

  @Post('save-details')
  async saveProviderDetails(
    @Body() body: SaveProviderDetails,
    @Req() request: Request,
  ) {
    return this.userService.saveProviderDetails(body, request.user as any);
  }

  @Patch('switch-user-type')
  async switchUserType(@Body() body: SwitchUserType, @Req() req: Request) {
    return this.userService.switchUserType(body.userType, req.user as any);
  }

  @Get('wallet')
  async getWallet(@Req() req: Request) {
    return this.userService.getWallet(req.user as any);
  }

  @Get('disputes')
  async getDisputes(@Query() query: DisputeQuery, @Req() request: Request) {
    return this.userService.getDisputes(
      query.pagination,
      query.filter,
      request.user as any,
    );
  }

  @Post('feedback')
  async submitFeedback(@Body() body: FeedbackDto, @Req() request: Request) {
    return this.userService.submitFeedback(body, request.user as any);
  }

  @Post('deletion-request')
  async createRequest(
    @Body() body: CreateDeletionRequestDto,
    @Req() request: Request,
  ) {
    return this.userService.createDeletionRequest(body, request.user as any);
  }

  @Delete('deletion-request/:uuid/confirm-deletion')
  async confirmAccountDeletion(
    @Param('uuid') uuid: string,
    @Body() body: ConfirmDeletionRequestDto,
    @Req() request: Request,
  ) {
    return this.userService.confirmAccountDeletion(
      uuid,
      body,
      request.user as any,
    );
  }
}
