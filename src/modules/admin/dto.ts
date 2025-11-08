import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Length,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  AccountTier,
  DisputeResolutionAction,
  DisputeStatus,
  JobStatus,
  ReasonCategoryType,
  ReportStatus,
  UserType,
  TransactionStatus,
} from 'src/types';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdminLoginDTO {
  @IsString()
  email: string;

  @IsString()
  password: string;
}

export class AdminVerifyOtpDto {
  @IsString()
  pinId: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsEmail()
  email: string;
}

export class AdminCreateTeamMemberDto {
  @IsString()
  @Length(1, 75)
  firstName: string;

  @IsString()
  @Length(1, 75)
  lastName: string;

  @IsEmail()
  @Length(1, 100)
  email: string;

  @IsOptional()
  @IsString()
  @Length(6, 50)
  password?: string;

  @IsOptional()
  @IsUUID('4')
  roleUuid?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleUuids?: string[];
}

export class AdminUpdateTeamMemberDto {
  @IsOptional()
  @IsUUID('4')
  roleUuid?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleUuids?: string[];
}

export class AdminListTeamMembersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleUuids?: string[];
}

export class AdminInitiateResetPasswordDto {
  @IsEmail()
  email: string;
}

export class AdminResendOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  pinId: string;
}

export class AdminNewResetPasswordDto {
  @IsString()
  @Length(1, 50)
  password: string;
}

export class AdminChangePasswordDto {
  @IsString()
  @Length(1, 50)
  oldPassword: string;

  @IsString()
  @Length(1, 50)
  newPassword: string;
}

export class AdminListRolesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminCreateRoleDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  permissionUuids: string[];
}

export class AdminUpdateRoleDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  permissionUuids?: string[];
}

export class AdminAssignRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleUuids: string[];
}

export enum AdminCustomerStatus {
  SUSPENDED = 'SUSPENDED',
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
}

export enum AdminProviderStatus {
  SUSPENDED = 'SUSPENDED',
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
}

export class AdminFetchCustomersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AdminCustomerStatus)
  status?: AdminCustomerStatus;
}

export class AdminFetchProvidersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AdminProviderStatus)
  status?: AdminProviderStatus;
}

export class AdminFetchCustomerJobsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminFetchProviderJobsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminFetchJobsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminFetchDisputesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminResolveDisputeDto {
  @IsEnum(DisputeResolutionAction)
  action: DisputeResolutionAction;

  @IsString()
  @Length(1, 500)
  note: string;

  @ValidateIf((dto: AdminResolveDisputeDto) =>
    dto.action === DisputeResolutionAction.PARTIAL_REFUND,
  )
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;
}

export class AdminFetchReportsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}

export class AdminResolveReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AdminFetchFeedbacksDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;
}

export class AdminSuspendUserDto {
  @IsString()
  @Length(1, 500)
  reason: string;
}

export class AdminChatHistoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsString()
  providerUuid: string;

  @IsString()
  customerUuid: string;
}

export class AdminWalletTransactionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;
}

export class AdminFetchProviderReviewsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class AdminDashboardPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export enum AdminDashboardDateFilter {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  LAST_WEEK = 'LAST_WEEK',
  LAST_7_DAYS = 'LAST_7_DAYS',
  THIS_MONTH = 'THIS_MONTH',
  LAST_30_DAYS = 'LAST_30_DAYS',
  CUSTOM = 'CUSTOM',
}

export enum AdminProviderAnalyticsFilter {
  TODAY = 'TODAY',
  CURRENT_WEEK = 'CURRENT_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  THIS_YEAR = 'THIS_YEAR',
  ALL_TIME = 'ALL_TIME',
  CUSTOM = 'CUSTOM',
}

export class AdminDashboardFilterDto {
  @IsOptional()
  @IsEnum(AdminDashboardDateFilter)
  filter?: AdminDashboardDateFilter;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminDashboardPaginationDto)
  categoriesPagination?: AdminDashboardPaginationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminDashboardPaginationDto)
  locationsPagination?: AdminDashboardPaginationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminDashboardPaginationDto)
  providersPagination?: AdminDashboardPaginationDto;
}

export class AdminProviderAnalyticsDto {
  @IsOptional()
  @IsEnum(AdminProviderAnalyticsFilter)
  filter?: AdminProviderAnalyticsFilter;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateMainCategory {
  @IsString()
  name: string;

  @IsString()
  icon: string;
}

export class UpdateMainCategory {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  icon: string;
}

export class CreateSubCategory {
  @IsString()
  name: string;

  @IsString()
  mainCategoryUuid: string;
}

export class UpdateSubCategory {
  @IsString()
  @IsOptional()
  name: string;
}

export class CreateReasonCategory {
  @IsString()
  name: string;

  @ApiProperty({ enum: ReasonCategoryType, enumName: 'ReasonCategoryType' })
  @IsEnum(ReasonCategoryType)
  type: ReasonCategoryType;
}

export class AdminUpsertSubCategoryDto {
  @IsOptional()
  @IsUUID('4')
  uuid?: string;

  @IsString()
  name: string;
}

export class AdminCreateMainCategoryWithSubsDto {
  @IsString()
  name: string;

  @IsString()
  icon: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminUpsertSubCategoryDto)
  subCategories?: AdminUpsertSubCategoryDto[];
}

export class AdminUpdateMainCategoryWithSubsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminUpsertSubCategoryDto)
  subCategories?: AdminUpsertSubCategoryDto[];
}

export class AdminDeleteSubCategoryDto {
  @IsOptional()
  @IsUUID('4')
  alternativeSubCategoryUuid?: string;
}

export class AdminDeleteMainCategoryDto {
  @IsOptional()
  @IsUUID('4')
  alternativeSubCategoryUuid?: string;
}

export class AdminFetchReasonCategoriesDto {
  @IsOptional()
  @IsEnum(ReasonCategoryType)
  type?: ReasonCategoryType;
}

export class AdminCreateAccountTierDto {
  @IsEnum(AccountTier)
  tier: AccountTier;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  levelLabel?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minJobs?: number;

  @IsOptional()
  @IsNumber()
  minAvgRating?: number;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class AdminUpdateAccountTierDto {
  @IsOptional()
  @IsEnum(AccountTier)
  tier?: AccountTier;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  levelLabel?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minJobs?: number;

  @IsOptional()
  @IsNumber()
  minAvgRating?: number;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class AdminCreateJobTipDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AdminUpdateJobTipDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
