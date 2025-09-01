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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { UsersService } from './users.service';
import { BankAccount, Users } from './users.entity';
import { IAuthContext } from 'src/types';
import { Request } from 'express';
import {
  BankAccountDto,
  CancelOfferDto,
  ConfirmDeletionRequestDto,
  CounterOfferDto,
  CreateDeletionRequestDto,
  DisputeQuery,
  FeedbackDto,
  PaginatedConversationsDto,
  PaginatedDisputesDto,
  PaginatedReviewsDto,
  PaginationQuery,
  ProvidersDashboardDto,
  ReportConversationDto,
  ResolveBankAccountDto,
  SaveLocationDto,
  SavePricesDto,
  SaveProviderDetails,
  SendMessageDto,
  SwitchUserType,
  UpdatePricesDto,
  UpdateServiceDescriptionDto,
  VerifyIdentityDto,
  WithdrawFundsDto,
} from './users.dto';
import { Location } from 'src/entities/location.entity';
import { Wallet } from '../wallet/wallet.entity';
import { ReadStateService } from '../ws/read-state.service';

@Controller('providers')
@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProvidersController {
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

  @Get('reviews')
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  @ApiOkResponse({
    type: PaginatedReviewsDto,
    description: 'Provider reviews fetched successfully',
  })
  async fetchUserReviews(@Query() query: PaginationQuery, @Req() req: Request) {
    const { uuid } = req.user as any as IAuthContext;
    return this.userService.fetchUserReviews(uuid, query.pagination);
  }

  @Patch('service-description')
  async updateServiceDescription(
    @Body() body: UpdateServiceDescriptionDto,
    @Req() req: Request,
  ) {
    return this.userService.updateServiceDescription(
      body.description,
      req.user as any,
    );
  }

  @Patch('prices')
  async updatePrices(@Body() body: UpdatePricesDto, @Req() req: Request) {
    return this.userService.updatePrices(body, req.user as any);
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
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'defaultOnly', required: false })
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
  @ApiOkResponse({
    type: Wallet,
    isArray: true,
    description: 'Wallet details fetched successfully',
  })
  async getWallet(@Req() req: Request) {
    return this.userService.getWallet(req.user as any);
  }

  @Post('bank-account')
  async addBankAccount(@Body() body: BankAccountDto, @Req() req: Request) {
    return this.userService.addBankAccount(body, req.user as any);
  }

  @Get('bank-account')
  @ApiOkResponse({
    type: BankAccount,
    isArray: true,
    description: 'Bank accounts fetched successfully',
  })
  async getBankAccounts(@Req() req: Request) {
    return this.userService.getBankAccounts(req.user as any);
  }

  @Delete('bank-account/:uuid')
  async deleteBankAccount(@Param('uuid') uuid: string, @Req() req: Request) {
    return this.userService.deleteBankAccount(uuid, req.user as any);
  }

  @Post('bank-account/resolve')
  async resolveBankAccount(@Body() body: ResolveBankAccountDto) {
    return this.userService.resolveBankAccount(body);
  }

  @Post('wallet/withdraw')
  async withdrawFunds(@Body() body: WithdrawFundsDto, @Req() req: Request) {
    return this.userService.withdrawFunds(body, req.user as any);
  }

  @Get('analytics')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: Request,
  ) {
    return this.userService.getAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      req.user as any,
    );
  }

  @Get('disputes')
  @ApiOkResponse({
    type: PaginatedDisputesDto,
    isArray: true,
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

  @Get('conversations')
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({
    type: PaginatedConversationsDto,
    description: 'Provider conversations fetched successfully',
  })
  async fetchProviderConversations(
    @Query() query: PaginationQuery,
    @Query('search') search: string,
    @Req() request: Request,
  ) {
    return this.userService.fetchProviderConversations(
      query.pagination,
      request.user as any,
      search,
    );
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

  @Patch('offer/:uuid/accept')
  async updateOffer(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.userService.acceptOffer(uuid, request.user as any);
  }

  @Post('offer/:uuid/decline')
  async declineOffer(
    @Param('uuid') uuid: string,
    @Body() body: CancelOfferDto,
    @Req() request: Request,
  ) {
    return this.userService.declineOffer(uuid, body, request.user as any);
  }

  @Post('offer/:uuid/counter')
  async counterOffer(
    @Param('uuid') uuid: string,
    @Body() body: CounterOfferDto,
    @Req() request: Request,
  ) {
    return this.userService.counterOffer(uuid, body, request.user as any);
  }

  @Post('conversation/:uuid/report')
  async reportConversation(
    @Param('uuid') uuid: string,
    @Body() body: ReportConversationDto,
    @Req() request: Request,
  ) {
    return this.userService.reportConversation(uuid, body, request.user as any);
  }
}

// 200k
// 60k => CAC
// 20 ~ 30k => Whogohost
// 110k => (maybe 40k) (play store) (maybe 160k) (app store)
// qoreid (1k), zoho (1k ~ 5k) termii (1k)

// -97k

// admin
