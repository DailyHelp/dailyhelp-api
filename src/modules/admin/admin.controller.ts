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
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/jwt-auth-guard';
import { AdminService } from './admin.service';
import { AllowUnauthorizedRequest } from 'src/decorators/unauthorized.decorator';
import { AdminLocalAuthGuard } from './guards/local-auth-guard';
import { AdminPermissionsGuard } from './guards/permissions.guard';
import { RequireAdminPermissions } from './decorators/permissions.decorator';
import * as dtos from './dto';
import {
  AccountTierSetting,
  JobTip,
  MainCategory,
  ReasonCategory,
  SubCategory,
} from './admin.entities';
import { extractTokenFromReq } from 'src/utils';
import { Request } from 'express';

@Controller('admin')
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  @RequireAdminPermissions('dashboard.view')
  getHello(): string {
    return 'Welcome to DailyHelp Admin!!!';
  }

  @Get('customers')
  @ApiOkResponse({ description: 'Customers fetched successfully' })
  @RequireAdminPermissions('users.view')
  fetchCustomers(@Query() query: dtos.AdminFetchCustomersDto) {
    return this.service.fetchCustomers(query);
  }

  @Get('providers')
  @ApiOkResponse({ description: 'Providers fetched successfully' })
  @RequireAdminPermissions('providers.view')
  fetchProviders(@Query() query: dtos.AdminFetchProvidersDto) {
    return this.service.fetchProviders(query);
  }

  @Post('users/:uuid/suspend')
  @ApiBody({ type: dtos.AdminSuspendUserDto })
  @ApiOkResponse({ description: 'User suspended successfully' })
  @RequireAdminPermissions('users.suspend')
  suspendUser(@Param('uuid') uuid: string, @Body() body: dtos.AdminSuspendUserDto) {
    return this.service.suspendUser(uuid, body);
  }

  @Post('users/:uuid/reactivate')
  @ApiOkResponse({ description: 'User reactivated successfully' })
  @RequireAdminPermissions('users.suspend')
  reactivateUser(@Param('uuid') uuid: string) {
    return this.service.reactivateUser(uuid);
  }

  @Get('customers/:uuid/jobs')
  @ApiOkResponse({ description: 'Customer jobs fetched successfully' })
  @RequireAdminPermissions('jobs.view')
  fetchCustomerJobs(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminFetchCustomerJobsDto,
  ) {
    return this.service.fetchCustomerJobs(uuid, query);
  }

  @Get('providers/:uuid/jobs')
  @ApiOkResponse({ description: 'Provider jobs fetched successfully' })
  @RequireAdminPermissions('jobs.view')
  fetchProviderJobs(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminFetchProviderJobsDto,
  ) {
    return this.service.fetchProviderJobs(uuid, query);
  }

  @Get('jobs')
  @ApiOkResponse({ description: 'Jobs fetched successfully' })
  @RequireAdminPermissions('jobs.view')
  fetchJobs(@Query() query: dtos.AdminFetchJobsDto) {
    return this.service.fetchJobs(query);
  }

  @Get('jobs/disputes')
  @ApiOkResponse({ description: 'Job disputes fetched successfully' })
  @RequireAdminPermissions('disputes.view')
  fetchDisputes(@Query() query: dtos.AdminFetchDisputesDto) {
    return this.service.fetchDisputes(query);
  }

  @Patch('jobs/disputes/:uuid/resolve')
  @ApiBody({ type: dtos.AdminResolveDisputeDto })
  @ApiOkResponse({ description: 'Job dispute resolved successfully' })
  @RequireAdminPermissions('disputes.resolve')
  resolveDispute(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminResolveDisputeDto,
    @Req() req: Request,
  ) {
    return this.service.resolveDispute(uuid, body, req.user as any);
  }

  @Get('reports')
  @ApiOkResponse({ description: 'Reports fetched successfully' })
  @RequireAdminPermissions('reports.view')
  fetchReports(@Query() query: dtos.AdminFetchReportsDto) {
    return this.service.fetchReports(query);
  }

  @Patch('reports/:uuid/resolve')
  @ApiBody({ type: dtos.AdminResolveReportDto })
  @ApiOkResponse({ description: 'Report resolved successfully' })
  @RequireAdminPermissions('reports.resolve')
  resolveReport(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminResolveReportDto,
    @Req() req: Request,
  ) {
    return this.service.resolveReport(uuid, body, req.user as any);
  }

  @Get('feedbacks')
  @ApiOkResponse({ description: 'Feedback fetched successfully' })
  @RequireAdminPermissions('feedback.view')
  fetchFeedbacks(@Query() query: dtos.AdminFetchFeedbacksDto) {
    return this.service.fetchFeedbacks(query);
  }

  @Get('jobs/:uuid/timelines')
  @ApiOkResponse({ description: 'Job timelines fetched successfully' })
  @RequireAdminPermissions('jobs.view')
  fetchJobTimelines(@Param('uuid') uuid: string) {
    return this.service.fetchJobTimelines(uuid);
  }

  @Get('jobs/:uuid/dispute')
  @ApiOkResponse({ description: 'Job dispute fetched successfully' })
  @RequireAdminPermissions('disputes.view')
  fetchJobDispute(@Param('uuid') uuid: string) {
    return this.service.fetchJobDispute(uuid);
  }

  @Get('conversations/history')
  @ApiOkResponse({ description: 'Chat history fetched successfully' })
  @RequireAdminPermissions('users.view')
  fetchChatHistory(@Query() query: dtos.AdminChatHistoryDto) {
    return this.service.fetchChatHistory(query);
  }

  @Get('customers/:uuid/wallet')
  @ApiOkResponse({ description: 'Customer wallet fetched successfully' })
  @RequireAdminPermissions('users.view')
  fetchCustomerWallet(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminWalletTransactionsDto,
  ) {
    return this.service.fetchCustomerWallet(uuid, query);
  }

  @Get('providers/:uuid/wallet')
  @ApiOkResponse({ description: 'Provider wallet fetched successfully' })
  @RequireAdminPermissions('providers.view')
  fetchProviderWallet(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminWalletTransactionsDto,
  ) {
    return this.service.fetchProviderWallet(uuid, query);
  }

  @Get('providers/:uuid/reviews')
  @ApiOkResponse({ description: 'Provider reviews fetched successfully' })
  @RequireAdminPermissions('providers.view')
  fetchProviderReviews(
    @Param('uuid') uuid: string,
    @Query() query: dtos.AdminFetchProviderReviewsDto,
  ) {
    return this.service.fetchProviderReviews(uuid, query);
  }

  @Get('providers/:uuid/analytics')
  @ApiOkResponse({ description: 'Provider analytics fetched successfully' })
  @RequireAdminPermissions('providers.view')
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
  @RequireAdminPermissions('dashboard.view')
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
  @RequireAdminPermissions('team_members.manage_members')
  @ApiCreatedResponse({ description: 'Team member created successfully' })
  createUser(@Body() body: dtos.AdminCreateTeamMemberDto) {
    return this.service.createUser(body);
  }

  @Get('team-members')
  @RequireAdminPermissions('team_members.view')
  @ApiOkResponse({ description: 'Team members fetched successfully' })
  listTeamMembers(@Query() query: dtos.AdminListTeamMembersDto) {
    return this.service.listTeamMembers(query);
  }

  @Get('team-members/:uuid')
  @RequireAdminPermissions('team_members.view')
  @ApiOkResponse({ description: 'Team member fetched successfully' })
  getTeamMember(@Param('uuid') uuid: string) {
    return this.service.getTeamMember(uuid);
  }

  @Post('team-members')
  @RequireAdminPermissions('team_members.manage_members')
  @ApiCreatedResponse({ description: 'Team member created successfully' })
  createTeamMember(@Body() body: dtos.AdminCreateTeamMemberDto) {
    return this.service.createUser(body);
  }

  @Patch('team-members/:uuid')
  @RequireAdminPermissions('team_members.edit_member_role')
  @ApiOkResponse({ description: 'Team member updated successfully' })
  updateTeamMember(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminUpdateTeamMemberDto,
  ) {
    return this.service.updateTeamMember(uuid, body);
  }

  @Delete('team-members/:uuid')
  @RequireAdminPermissions('team_members.manage_members')
  @ApiOkResponse({ description: 'Team member removed successfully' })
  deleteTeamMember(@Param('uuid') uuid: string) {
    return this.service.deleteTeamMember(uuid);
  }

  @Get('permissions')
  @RequireAdminPermissions('team_members.view')
  @ApiOkResponse({ description: 'Permissions fetched successfully' })
  listPermissions() {
    return this.service.listPermissions();
  }

  @Get('roles')
  @RequireAdminPermissions('team_members.view')
  @ApiOkResponse({ description: 'Roles fetched successfully' })
  listRoles(@Query() query: dtos.AdminListRolesDto) {
    return this.service.listRoles(query);
  }

  @Get('roles/:uuid')
  @RequireAdminPermissions('team_members.view')
  @ApiOkResponse({ description: 'Role fetched successfully' })
  getRole(@Param('uuid') uuid: string) {
    return this.service.getRole(uuid);
  }

  @Post('roles')
  @RequireAdminPermissions('team_members.manage_roles')
  @ApiCreatedResponse({ description: 'Role created successfully' })
  createRole(@Body() body: dtos.AdminCreateRoleDto) {
    return this.service.createRole(body);
  }

  @Patch('roles/:uuid')
  @RequireAdminPermissions('team_members.edit_roles')
  @ApiOkResponse({ description: 'Role updated successfully' })
  updateRole(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminUpdateRoleDto,
  ) {
    return this.service.updateRole(uuid, body);
  }

  @Delete('roles/:uuid')
  @RequireAdminPermissions('team_members.manage_roles')
  @ApiOkResponse({ description: 'Role deleted successfully' })
  deleteRole(@Param('uuid') uuid: string) {
    return this.service.deleteRole(uuid);
  }

  @Patch('team-members/:uuid/roles')
  @RequireAdminPermissions('team_members.edit_member_role')
  @ApiOkResponse({ description: 'Team member roles updated successfully' })
  assignRolesToTeamMember(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminAssignRolesDto,
  ) {
    return this.service.assignRolesToAdmin(uuid, body);
  }

  @Post('main-category')
  @RequireAdminPermissions('settings.view')
  createMainCategory(@Body() body: dtos.CreateMainCategory) {
    return this.service.createMainCategory(body);
  }

  @Post('categories')
  @RequireAdminPermissions('settings.view')
  createMainCategoryWithSubs(
    @Body() body: dtos.AdminCreateMainCategoryWithSubsDto,
  ) {
    return this.service.createMainCategoryWithSubCategories(body);
  }

  @Get('main-categories')
  @ApiOkResponse({
    type: MainCategory,
    isArray: true,
    description: 'Main categories fetched successfully',
  })
  @RequireAdminPermissions('settings.view')
  fetchMainCategories() {
    return this.service.fetchMainCategories();
  }

  @Post('main-category/:uuid/edit')
  @RequireAdminPermissions('settings.view')
  editMainCategory(
    @Param('uuid') uuid: string,
    @Body() body: dtos.UpdateMainCategory,
  ) {
    return this.service.editMainCategory(uuid, body);
  }

  @Patch('categories/:uuid')
  @RequireAdminPermissions('settings.view')
  updateMainCategoryWithSubs(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminUpdateMainCategoryWithSubsDto,
  ) {
    return this.service.updateMainCategoryWithSubCategories(uuid, body);
  }

  @Post('main-category/:uuid/delete')
  @RequireAdminPermissions('settings.view')
  @ApiBody({ type: dtos.AdminDeleteMainCategoryDto })
  deleteMainCategory(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminDeleteMainCategoryDto,
  ) {
    return this.service.deleteMainCategory(uuid, body);
  }

  @Post('sub-category')
  @RequireAdminPermissions('settings.view')
  createSubCategory(@Body() body: dtos.CreateSubCategory) {
    return this.service.createSubCategory(body);
  }

  @Get('main-category/:uuid/sub-categories')
  @ApiOkResponse({
    type: SubCategory,
    isArray: true,
    description: 'Sub categories fetched successfully',
  })
  @RequireAdminPermissions('settings.view')
  fetchSubCategories(@Param('uuid') uuid: string) {
    return this.service.fetchSubCategories(uuid);
  }

  @Post('sub-category/:uuid/edit')
  @RequireAdminPermissions('settings.view')
  editSubCategory(
    @Param('uuid') uuid: string,
    @Body() body: dtos.UpdateSubCategory,
  ) {
    return this.service.editSubCategory(uuid, body);
  }

  @Post('sub-category/:uuid/delete')
  @RequireAdminPermissions('settings.view')
  @ApiBody({ type: dtos.AdminDeleteSubCategoryDto })
  deleteSubCategory(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminDeleteSubCategoryDto,
  ) {
    return this.service.deleteSubCategory(uuid, body);
  }

  @Post('reason-category')
  @RequireAdminPermissions('settings.view')
  reasonCategory(@Body() body: dtos.CreateReasonCategory) {
    return this.service.createReasonCategory(body);
  }

  @Get('reason-categories')
  @RequireAdminPermissions('settings.view')
  @ApiOkResponse({
    type: ReasonCategory,
    isArray: true,
    description: 'Reason categories fetched successfully',
  })
  fetchReasonCategories(@Query() query: dtos.AdminFetchReasonCategoriesDto) {
    return this.service.fetchReasonCategories(query);
  }

  @Post('reason-category/:uuid/delete')
  @RequireAdminPermissions('settings.view')
  deleteReasonCategory(@Param('uuid') uuid: string) {
    return this.service.deleteReasonCategory(uuid);
  }

  @Get('account-tiers')
  @RequireAdminPermissions('settings.view')
  @ApiOkResponse({
    type: AccountTierSetting,
    isArray: true,
    description: 'Tier configurations fetched successfully',
  })
  listAccountTiers() {
    return this.service.listAccountTiers();
  }

  @Post('account-tiers')
  @RequireAdminPermissions('settings.view')
  createAccountTier(@Body() body: dtos.AdminCreateAccountTierDto) {
    return this.service.createAccountTier(body);
  }

  @Patch('account-tiers/:uuid')
  @RequireAdminPermissions('settings.view')
  updateAccountTier(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminUpdateAccountTierDto,
  ) {
    return this.service.updateAccountTier(uuid, body);
  }

  @Delete('account-tiers/:uuid')
  @RequireAdminPermissions('settings.view')
  removeAccountTier(@Param('uuid') uuid: string) {
    return this.service.deleteAccountTier(uuid);
  }

  @Get('job-tips')
  @RequireAdminPermissions('settings.view')
  @ApiOkResponse({
    type: JobTip,
    isArray: true,
    description: 'Job tips fetched successfully',
  })
  listJobTips() {
    return this.service.listJobTips();
  }

  @Post('job-tips')
  @RequireAdminPermissions('settings.view')
  createJobTip(@Body() body: dtos.AdminCreateJobTipDto) {
    return this.service.createJobTip(body);
  }

  @Patch('job-tips/:uuid')
  @RequireAdminPermissions('settings.view')
  updateJobTip(
    @Param('uuid') uuid: string,
    @Body() body: dtos.AdminUpdateJobTipDto,
  ) {
    return this.service.updateJobTip(uuid, body);
  }

  @Delete('job-tips/:uuid')
  @RequireAdminPermissions('settings.view')
  deleteJobTip(@Param('uuid') uuid: string) {
    return this.service.deleteJobTip(uuid);
  }
}
