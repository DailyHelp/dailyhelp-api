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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiBody,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { Request } from 'express';
import { IAuthContext, PaymentPurpose } from 'src/types';
import { Users } from './users.entity';
import {
  CancelOfferDto,
  ClientDashboardDto,
  ClientDashboardQuery,
  ConfirmDeletionRequestDto,
  CreateDeletionRequestDto,
  DisputeQuery,
  FeedbackDto,
  PaginatedConversationsDto,
  PaginatedDisputesDto,
  PaginatedMessageDto,
  PaginatedReviewsDto,
  PaginationQuery,
  ProviderRatingSummaryDto,
  PaymentInfo,
  ReportConversationDto,
  SaveLocationDto,
  SendMessageDto,
  SendOfferDto,
  SwitchUserType,
  TopRatedProvider,
  VerifyIdentityDto,
} from './users.dto';
import { Location } from 'src/entities/location.entity';
import { ExpiredJwtAuthGuard } from 'src/guards/expired-jwt-auth-guard';
import { Wallet } from '../wallet/wallet.entity';
import { ReadStateService } from '../ws/read-state.service';

@Controller('customers')
@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiExtraModels(PaymentInfo, SwitchUserType)
export class CustomersController {
  constructor(
    private readonly userService: UsersService,
    private readonly read: ReadStateService,
  ) {}

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
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  @ApiOkResponse({
    type: ClientDashboardDto,
    description: 'Client dashboard fetched successfully',
  })
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

  @Get(':providerUuid/reviews')
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  @ApiOkResponse({
    type: PaginatedReviewsDto,
    description: 'Provider reviews fetched successfully',
  })
  async fetchUserReviews(
    @Param('providerUuid') uuid: string,
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
    @Query('search') search: string,
    @Req() request: Request,
  ) {
    return this.userService.fetchLocations(
      defaultOnly,
      request.user as any,
      search,
    );
  }

  @Patch('location/:uuid/set-default')
  setLocationAsDefault(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.userService.setLocationAsDefault(uuid, request.user as any);
  }

  @Delete('location/:uuid/delete')
  deleteLocation(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.userService.deleteLocation(uuid, request.user as any);
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

  @Post('conversation/:uuid/read')
  async readConversation(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.read.markConversationRead((request.user as any)?.uuid, uuid);
  }

  @Post('conversation/:uuid/report')
  async reportConversation(
    @Param('uuid') uuid: string,
    @Body() body: ReportConversationDto,
    @Req() request: Request,
  ) {
    return this.userService.reportConversation(uuid, body, request.user as any);
  }

  @Patch('offer/:uuid/update')
  @ApiBody({ type: SendOfferDto })
  async updateOffer(
    @Param('uuid') uuid: string,
    @Body() body: Partial<SendOfferDto>,
    @Req() request: Request,
  ) {
    return this.userService.updateOffer(uuid, body, request.user as any);
  }

  @Patch('offer/:uuid/cancel')
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
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({
    type: PaginatedConversationsDto,
    description: 'User conversations fetched successfully',
  })
  async fetchCustomerConversations(
    @Query() query: PaginationQuery,
    @Query('search') search: string,
    @Req() request: Request,
  ) {
    return this.userService.fetchCustomerConversations(
      query.pagination,
      request.user as any,
      search,
    );
  }

  @Get('conversations/:uuid/messages')
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  @ApiOkResponse({
    type: PaginatedMessageDto,
    description: 'Conversation messages fetched successfully',
  })
  async fetchConversationMessages(
    @Param('uuid') uuid: string,
    @Query() query: PaginationQuery,
    @Req() req: Request,
  ) {
    return this.userService.fetchConversationMessages(
      uuid,
      query.pagination,
      req.user as any,
    );
  }

  @Get(':uuid/similar-providers')
  @ApiOkResponse({
    type: TopRatedProvider,
    isArray: true,
    description: 'Similar providers fetched successfully',
  })
  async fetchSimilarProviders(@Param('uuid') selectedUserUuid: string) {
    return this.userService.fetchSimilarProviders(selectedUserUuid);
  }

  @Patch('switch-user-type')
  @ApiBody({
    schema: { $ref: getSchemaPath(SwitchUserType) },
    examples: {
      Provider: { value: { userType: 'PROVIDER' } },
      Customer: { value: { userType: 'CUSTOMER' } },
    },
  })
  async switchUserType(@Body() body: SwitchUserType, @Req() req: Request) {
    return this.userService.switchUserType(body.userType, req.user as any);
  }

  @Get('providers/:uuid/reviews/summary')
  @ApiOkResponse({
    type: ProviderRatingSummaryDto,
    description: 'Provider rating summary fetched successfully',
  })
  async fetchProviderReviewSummary(@Param('uuid') uuid: string) {
    return this.userService.fetchProviderRatingSummary(uuid);
  }

  @Post('initialize-paystack-payment')
  @ApiBody({
    schema: { $ref: getSchemaPath(PaymentInfo) },
    examples: {
      FundWallet: {
        summary: 'Fund wallet',
        value: {
          purpose: PaymentPurpose.FUND_WALLET,
          amount: 5000,
        },
      },
      JobOffer: {
        summary: 'Pay for job offer',
        value: {
          purpose: PaymentPurpose.JOB_OFFER,
          offerUuid: 'offer-uuid',
          conversationUuid: 'conversation-uuid',
          description: 'Payment for accepted offer',
        },
      },
    },
  })
  initializePaystackPayment(
    @Body() paymentInfo: PaymentInfo,
    @Req() request: Request,
  ) {
    return this.userService.initializePaystackPayment(
      paymentInfo,
      request.user as any,
    );
  }

  @Post('verify-transaction/:transactionId')
  @UseGuards(ExpiredJwtAuthGuard)
  @ApiBody({
    schema: { $ref: getSchemaPath(PaymentInfo) },
    examples: {
      FundWallet: {
        summary: 'Fund wallet',
        value: {
          purpose: PaymentPurpose.FUND_WALLET,
          amount: 5000,
        },
      },
      JobOffer: {
        summary: 'Pay for job offer',
        value: {
          purpose: PaymentPurpose.JOB_OFFER,
          offerUuid: 'offer-uuid',
          conversationUuid: 'conversation-uuid',
          description: 'Payment for accepted offer',
        },
      },
    },
  })
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
  @ApiOkResponse({
    type: Wallet,
    isArray: true,
    description: 'Wallet details fetched successfully',
  })
  async getWallet(@Req() req: Request) {
    return this.userService.getWallet(req.user as any);
  }

  @Get('disputes')
  @ApiOkResponse({
    type: PaginatedDisputesDto,
    description: 'Job disputes fetched successfully',
  })
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
