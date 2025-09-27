import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/jwt-auth-guard';
import { AdminService } from './admin.service';
import { AllowUnauthorizedRequest } from 'src/decorators/unauthorized.decorator';
import { AdminLocalAuthGuard } from './guards/local-auth-guard';
import * as dtos from './dto';
import { MainCategory, SubCategory } from './admin.entities';
import { extractTokenFromReq } from 'src/utils';
import { Request } from 'express';

@Controller('admin')
@ApiTags('admin')
@UseGuards(AdminJwtAuthGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  getHello(): string {
    return 'Welcome to DailyHelp Admin!!!';
  }

  @Get('customers')
  @ApiOkResponse({ description: 'Customers fetched successfully' })
  fetchCustomers(@Query() query: dtos.AdminFetchCustomersDto) {
    return this.service.fetchCustomers(query);
  }

  @Get('providers')
  @ApiOkResponse({ description: 'Providers fetched successfully' })
  fetchProviders(@Query() query: dtos.AdminFetchProvidersDto) {
    return this.service.fetchProviders(query);
  }

  @Post('users/:uuid/suspend')
  @ApiBody({ type: dtos.AdminSuspendUserDto })
  @ApiOkResponse({ description: 'User suspended successfully' })
  suspendUser(@Param('uuid') uuid: string, @Body() body: dtos.AdminSuspendUserDto) {
    return this.service.suspendUser(uuid, body);
  }

  @Post('users/:uuid/reactivate')
  @ApiOkResponse({ description: 'User reactivated successfully' })
  reactivateUser(@Param('uuid') uuid: string) {
    return this.service.reactivateUser(uuid);
  }

  @Get('customers/:uuid/jobs')
  @ApiOkResponse({ description: 'Customer jobs fetched successfully' })
  fetchCustomerJobs(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminFetchCustomerJobsDto,
  ) {
    return this.service.fetchCustomerJobs(uuid, query);
  }

  @Get('providers/:uuid/jobs')
  @ApiOkResponse({ description: 'Provider jobs fetched successfully' })
  fetchProviderJobs(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminFetchProviderJobsDto,
  ) {
    return this.service.fetchProviderJobs(uuid, query);
  }

  @Get('jobs')
  @ApiOkResponse({ description: 'Jobs fetched successfully' })
  fetchJobs(@Query() query: dtos.AdminFetchJobsDto) {
    return this.service.fetchJobs(query);
  }

  @Get('jobs/disputes')
  @ApiOkResponse({ description: 'Job disputes fetched successfully' })
  fetchDisputes(@Query() query: dtos.AdminFetchDisputesDto) {
    return this.service.fetchDisputes(query);
  }

  @Patch('jobs/disputes/:uuid/resolve')
  @ApiBody({ type: dtos.AdminResolveDisputeDto })
  @ApiOkResponse({ description: 'Job dispute resolved successfully' })
  resolveDispute(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminResolveDisputeDto,
    @Req() req: Request,
  ) {
    return this.service.resolveDispute(uuid, body, req.user as any);
  }

  @Get('reports')
  @ApiOkResponse({ description: 'Reports fetched successfully' })
  fetchReports(@Query() query: dtos.AdminFetchReportsDto) {
    return this.service.fetchReports(query);
  }

  @Patch('reports/:uuid/resolve')
  @ApiBody({ type: dtos.AdminResolveReportDto })
  @ApiOkResponse({ description: 'Report resolved successfully' })
  resolveReport(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminResolveReportDto,
    @Req() req: Request,
  ) {
    return this.service.resolveReport(uuid, body, req.user as any);
  }

  @Get('feedbacks')
  @ApiOkResponse({ description: 'Feedback fetched successfully' })
  fetchFeedbacks(@Query() query: dtos.AdminFetchFeedbacksDto) {
    return this.service.fetchFeedbacks(query);
  }

  @Get('jobs/:uuid/timelines')
  @ApiOkResponse({ description: 'Job timelines fetched successfully' })
  fetchJobTimelines(@Param('uuid') uuid: string) {
    return this.service.fetchJobTimelines(uuid);
  }

  @Get('jobs/:uuid/dispute')
  @ApiOkResponse({ description: 'Job dispute fetched successfully' })
  fetchJobDispute(@Param('uuid') uuid: string) {
    return this.service.fetchJobDispute(uuid);
  }

  @Get('conversations/history')
  @ApiOkResponse({ description: 'Chat history fetched successfully' })
  fetchChatHistory(@Query() query: dtos.AdminChatHistoryDto) {
    return this.service.fetchChatHistory(query);
  }

  @Get('customers/:uuid/wallet')
  @ApiOkResponse({ description: 'Customer wallet fetched successfully' })
  fetchCustomerWallet(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminWalletTransactionsDto,
  ) {
    return this.service.fetchCustomerWallet(uuid, query);
  }

  @Get('providers/:uuid/wallet')
  @ApiOkResponse({ description: 'Provider wallet fetched successfully' })
  fetchProviderWallet(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminWalletTransactionsDto,
  ) {
    return this.service.fetchProviderWallet(uuid, query);
  }

  @Get('providers/:uuid/reviews')
  @ApiOkResponse({ description: 'Provider reviews fetched successfully' })
  fetchProviderReviews(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminFetchProviderReviewsDto,
  ) {
    return this.service.fetchProviderReviews(uuid, query);
  }

  @Get('providers/:uuid/analytics')
  @ApiOkResponse({ description: 'Provider analytics fetched successfully' })
  fetchProviderAnalytics(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminProviderAnalyticsDto,
  ) {
    return this.service.fetchProviderAnalytics(uuid, query);
  }

  @Get('dashboard')
  @ApiBody({ type: dtos.AdminDashboardFilterDto })
  @ApiOkResponse({
    description: 'Dashboard analytics fetched successfully',
  })
  dashboard(@Body() body: dtos.AdminDashboardFilterDto) {
    return this.service.fetchDashboardAnalytics(body);
  }

  @Post('auth/login')
  @AllowUnauthorizedRequest()
  @UseGuards(AdminLocalAuthGuard)
  @ApiBody({ type: dtos.AdminLoginDTO })
  @ApiCreatedResponse({
    description: 'Admin login initiated successfully',
    schema: {
      example: {
        status: true,
        data: {
          pinId: 'string',
          email: 'admin@example.com',
          otpRequired: true,
        },
      },
    },
  })
  login(@Body() _body: dtos.AdminLoginDTO, @Req() req: any) {
    return this.service.initiateLogin(req.user);
  }

  @Post('auth/verify-otp')
  @AllowUnauthorizedRequest()
  @ApiBody({ type: dtos.AdminVerifyOtpDto })
  @ApiCreatedResponse({
    description: 'Admin login OTP verified successfully',
    schema: {
      example: {
        status: true,
        data: {
          accessToken: 'string',
          user: {
            uuid: 'string',
            fullname: 'Jane Doe',
            email: 'admin@example.com',
          },
        },
      },
    },
  })
  verifyAdminLoginOtp(@Body() body: dtos.AdminVerifyOtpDto) {
    return this.service.verifyAdminLoginOtp(body);
  }

  @Post('auth/resend-login-otp')
  @AllowUnauthorizedRequest()
  @ApiBody({ type: dtos.AdminResendOtpDto })
  @ApiCreatedResponse({
    description: 'Admin login OTP resent successfully',
    schema: {
      example: {
        status: true,
        data: {
          pinId: 'string',
          email: 'admin@example.com',
          otpRequired: true,
        },
      },
    },
  })
  resendAdminLoginOtp(@Body() body: dtos.AdminResendOtpDto) {
    return this.service.resendAdminLoginOtp(body);
  }

  @Post('auth/initiate-reset-password')
  @AllowUnauthorizedRequest()
  @ApiBody({ type: dtos.AdminInitiateResetPasswordDto })
  @ApiCreatedResponse({
    description: 'Admin password reset initiated successfully',
    schema: {
      example: {
        status: true,
        data: {
          pinId: 'string',
          email: 'admin@example.com',
        },
      },
    },
  })
  initiateResetPassword(@Body() body: dtos.AdminInitiateResetPasswordDto) {
    return this.service.initiateResetPassword(body);
  }

  @Post('auth/verify-reset-otp')
  @AllowUnauthorizedRequest()
  @ApiBody({ type: dtos.AdminVerifyOtpDto })
  @ApiCreatedResponse({
    description: 'Admin reset password OTP verified successfully',
    schema: {
      example: {
        status: true,
        data: 'string',
      },
    },
  })
  verifyAdminResetOtp(@Body() body: dtos.AdminVerifyOtpDto) {
    return this.service.verifyAdminResetOtp(body);
  }

  @Post('auth/resend-reset-otp')
  @AllowUnauthorizedRequest()
  @ApiBody({ type: dtos.AdminResendOtpDto })
  @ApiCreatedResponse({
    description: 'Admin reset password OTP resent successfully',
    schema: {
      example: {
        status: true,
        data: {
          pinId: 'string',
          email: 'admin@example.com',
        },
      },
    },
  })
  resendResetPasswordOtp(@Body() body: dtos.AdminResendOtpDto) {
    return this.service.resendResetPasswordOtp(body);
  }

  @Post('auth/reset-password')
  @AllowUnauthorizedRequest()
  @ApiBody({ type: dtos.AdminNewResetPasswordDto })
  @ApiCreatedResponse({
    description: 'Admin password reset successfully',
    schema: {
      example: {
        status: true,
      },
    },
  })
  resetAdminPassword(
    @Body() body: dtos.AdminNewResetPasswordDto,
    @Req() req: Request,
  ) {
    const token = extractTokenFromReq(
      req,
      'Kindly provide a valid access token to reset your password',
    );
    return this.service.resetAdminPassword(body, token);
  }

  @Post('auth/change-password')
  @ApiBody({ type: dtos.AdminChangePasswordDto })
  @ApiCreatedResponse({
    description: 'Admin password updated successfully',
    schema: {
      example: {
        status: true,
      },
    },
  })
  changeAdminPassword(
    @Body() body: dtos.AdminChangePasswordDto,
    @Req() req: any,
  ) {
    return this.service.changeAdminPassword(body, req.user);
  }

  @Post('user')
  createUser(@Body() body: dtos.AdminUserDto) {
    return this.service.createUser(body);
  }

  @Post('main-category')
  createMainCategory(@Body() body: dtos.CreateMainCategory) {
    return this.service.createMainCategory(body);
  }

  @Get('main-categories')
  @ApiOkResponse({
    type: MainCategory,
    isArray: true,
    description: 'Main categories fetched successfully',
  })
  fetchMainCategories() {
    return this.service.fetchMainCategories();
  }

  @Post('main-category/:uuid/edit')
  editMainCategory(
    @Param('uuid') uuid: string,
    @Body() body: dtos.UpdateMainCategory,
  ) {
    return this.service.editMainCategory(uuid, body);
  }

  @Post('main-category/:uuid/delete')
  deleteMainCategory(@Param('uuid') uuid: string) {
    return this.service.deleteMainCategory(uuid);
  }

  @Post('sub-category')
  createSubCategory(@Body() body: dtos.CreateSubCategory) {
    return this.service.createSubCategory(body);
  }

  @Get('main-category/:uuid/sub-categories')
  @ApiOkResponse({
    type: SubCategory,
    isArray: true,
    description: 'Sub categories fetched successfully',
  })
  fetchSubCategories(@Param('uuid') uuid: string) {
    return this.service.fetchSubCategories(uuid);
  }

  @Post('sub-category/:uuid/edit')
  editSubCategory(
    @Param('uuid') uuid: string,
    @Body() body: dtos.UpdateSubCategory,
  ) {
    return this.service.editSubCategory(uuid, body);
  }

  @Post('sub-category/:uuid/delete')
  deleteSubCategory(@Param('uuid') uuid: string) {
    return this.service.deleteSubCategory(uuid);
  }

  @Post('reason-category')
  reasonCategory(@Body() body: dtos.CreateReasonCategory) {
    return this.service.createReasonCategory(body);
  }

  @Post('reason-category/:uuid/delete')
  deleteReasonCategory(@Param('uuid') uuid: string) {
    return this.service.deleteReasonCategory(uuid);
  }
}
