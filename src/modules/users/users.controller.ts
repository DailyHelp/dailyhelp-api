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
  CancelOfferDto,
  ClientDashboardQuery,
  ConfirmDeletionRequestDto,
  CreateDeletionRequestDto,
  DisputeQuery,
  FeedbackDto,
  PaginationQuery,
  PaymentInfo,
  ReportConversationDto,
  SaveLocationDto,
  SavePricesDto,
  SaveProviderDetails,
  SendMessageDto,
  SendOfferDto,
  SwitchUserType,
  VerifyIdentityDto,
} from './users.dto';
import { Location } from 'src/entities/location.entity';
import { ExpiredJwtAuthGuard } from 'src/guards/expired-jwt-auth-guard';

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

  @Get('client-dashboard')
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  async fetchClientDashboard(
    @Query() query: ClientDashboardQuery,
    @Req() req: Request,
  ) {
    return this.userService.fetchClientDashboard(
      query.pagination,
      query.filter,
      req.user as any,
    );
  }

  @Get('provider-dashboard')
  async fetchProviderDashboard(@Req() req: Request) {
    return this.userService.fetchProviderDashboard(req.user as any);
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

  @Post('location/:uuid/set-default')
  setLocationAsDefault(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.userService.setLocationAsDefault(uuid, request.user as any);
  }

  @Post('location/:uuid/delete')
  deleteLocation(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.userService.deleteLocation(uuid, request.user as any);
  }

  @Post('save-prices')
  async savePrices(@Body() body: SavePricesDto, @Req() request: Request) {
    return this.userService.savePrices(body, request.user as any);
  }

  @Post('save-provider-details')
  async saveProviderDetails(
    @Body() body: SaveProviderDetails,
    @Req() request: Request,
  ) {
    return this.userService.saveProviderDetails(body, request.user as any);
  }

  @Post(':uuid/send-offer')
  async sendOffer(
    @Param('uuid') uuid: string,
    @Body() body: SendOfferDto,
    @Req() request: Request,
  ) {
    return this.userService.sendOffer(uuid, body, request.user as any);
  }

  @Post('conversation/:uuid/send-message')
  async sendMessage(
    @Param('uuid') uuid: string,
    @Body() body: SendMessageDto,
    @Req() request: Request,
  ) {
    return this.userService.sendMessage(uuid, body, request.user as any);
  }

  @Post('conversation/:uuid/report')
  async reportConversation(
    @Param('uuid') uuid: string,
    @Body() body: ReportConversationDto,
    @Req() request: Request,
  ) {
    return this.userService.reportConversation(uuid, body, request.user as any);
  }

  @Post('offer/:uuid/update')
  async updateOffer(
    @Param('uuid') uuid: string,
    @Body() body: Partial<SendOfferDto>,
    @Req() request: Request,
  ) {
    return this.userService.updateOffer(uuid, body, request.user as any);
  }

  @Post('offer/:uuid/cancel')
  async cancelOffer(
    @Param('uuid') uuid: string,
    @Body() body: CancelOfferDto,
    @Req() request: Request,
  ) {
    return this.userService.cancelOffer(uuid, body, request.user as any);
  }

  @Post('offer/:uuid/decline')
  async declineOffer(
    @Param('uuid') uuid: string,
    @Body() body: CancelOfferDto,
    @Req() request: Request,
  ) {
    return this.userService.declineOffer(uuid, body, request.user as any);
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

  @Get('conversations/:uuid/messages')
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  async fetchConversationMessages(
    @Param('uuid') uuid: string,
    @Query() query: PaginationQuery,
  ) {
    return this.userService.fetchConversationMessages(uuid, query.pagination);
  }

  @Get(':uuid/similar-providers')
  async fetchSimilarProviders(@Param('uuid') selectedUserUuid: string) {
    return this.userService.fetchSimilarProviders(selectedUserUuid);
  }

  @Post('switch-user-type')
  async switchUserType(@Body() body: SwitchUserType, @Req() req: Request) {
    return this.userService.switchUserType(body.userType, req.user as any);
  }

  @Post('verify-transaction/:transactionId')
  @UseGuards(ExpiredJwtAuthGuard)
  verifyPayment(
    @Param('transactionId') transactionId: string,
    @Body() paymentInfo: PaymentInfo,
    @Req() request: Request,
  ) {
    return this.userService.verifyPayment(
      transactionId,
      paymentInfo,
      request.user as any,
    );
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

  @Post('deletion-request/:uuid/confirm-deletion')
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
