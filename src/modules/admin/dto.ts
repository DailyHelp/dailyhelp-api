import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { JobStatus, ReasonCategoryType, TransactionStatus } from 'src/types';
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

export class AdminUserDto {
  @IsString()
  @Length(1, 150)
  fullname: string;

  @IsEmail()
  @Length(1, 50)
  email: string;

  @IsString()
  @Length(1, 50)
  password: string;
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

export enum AdminCustomerStatus {
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
