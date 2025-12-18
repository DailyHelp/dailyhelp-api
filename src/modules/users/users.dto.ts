import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Users } from './users.entity';
import { Transform, Type } from 'class-transformer';
import { createPaginatedSwaggerDto, PaginationInput } from 'src/base/dto';
import {
  AccountTier,
  OfferStatus,
  PaymentPurpose,
  PaymentMethod,
  UserType,
  DisputeStatus,
} from 'src/types';
import { ApiProperty } from '@nestjs/swagger';
import { JobDispute } from '../jobs/job-dispute.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { Message } from 'src/entities/message.entity';
import { Transaction } from '../wallet/wallet.entity';

export class VerifyIdentityDto {
  @IsString()
  firstname: string;

  @IsString()
  middlename: string;

  @IsString()
  lastname: string;

  @IsString()
  dob: string;

  @IsString()
  gender: string;

  @IsString()
  nin: string;

  @IsString()
  bvn: string;

  @IsString()
  photo: string;
}

export class LoginResponseDto {
  status: boolean;
  data: {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    user: Users;
  };
}

export class SaveLocationDto {
  @IsString()
  address: string;

  @IsString()
  state: string;

  @IsString()
  lga: string;

  @IsString()
  description: string;

  @IsNumber()
  @IsOptional()
  lat: number;

  @IsNumber()
  @IsOptional()
  lng: number;

  @IsBoolean()
  @IsOptional()
  default: boolean;

  @IsString()
  @IsOptional()
  utilityBill: string;
}

export class SavePricesDto {
  @IsNumber()
  offerStartingPrice: number;

  @IsNumber()
  minimumOfferPrice: number;
}

export class SaveProviderDetails {
  @IsString()
  @IsOptional()
  subCategoryUuid: string;

  @IsString()
  @IsOptional()
  serviceDescription: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceImages: string[];
}

export class UpdateAvailabilityDto {
  @ApiProperty()
  @IsBoolean()
  availability: boolean;
}

export class PriceFilter {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;
}

export class ClientDashboardFilter {
  @IsString()
  @IsOptional()
  subCategory?: string;

  @IsString()
  @IsOptional()
  mainCategory?: string;

  @ValidateNested()
  @Type(() => PriceFilter)
  @IsOptional()
  priceRange?: PriceFilter;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minRating?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const v = String(value).toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'off'].includes(v)) return false;
    return value;
  })
  isSearchPage?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const v = String(value).toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'off'].includes(v)) return false;
    return value;
  })
  engaged?: boolean;
}

export class ClientDashboardQuery {
  @ValidateNested()
  @Type(() => ClientDashboardFilter)
  @IsOptional()
  filter?: ClientDashboardFilter;

  @ValidateNested()
  @Type(() => PaginationInput)
  pagination?: PaginationInput;
}

export class DisputeFilter {
  @ApiProperty({ enum: DisputeStatus, required: false, description: 'Comma-separated values allowed' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class DisputeQuery {
  @ValidateNested()
  @Type(() => DisputeFilter)
  @IsOptional()
  filter?: DisputeFilter;

  @ValidateNested()
  @Type(() => PaginationInput)
  pagination?: PaginationInput;
}

export class PaginationQuery {
  @ValidateNested()
  @Type(() => PaginationInput)
  pagination?: PaginationInput;
}

export class SendOfferDto {
  @IsNumber()
  amount: number;

  @IsString()
  description: string;

  @IsString({ each: true })
  attachments: string[];
}

export class SendMessageDto {
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  message: string;
}

export class ReportConversationDto {
  @IsString()
  reportCategory: string;

  @IsString()
  description: string;

  @IsString({ each: true })
  pictures: string[];
}

export class UpdateServiceDescriptionDto {
  @IsString()
  description: string;
}

export class UpdatePricesDto {
  @IsNumber()
  startingPrice: number;

  @IsNumber()
  minimumAcceptableOffer: number;
}

export class BankAccountDto {
  @IsString()
  accountNumber: string;

  @IsString()
  bankName: string;

  @IsString()
  accountName: string;

  @IsString()
  bankCode: string;
}

export class ResolveBankAccountDto {
  @IsString()
  accountNumber: string;

  @IsString()
  bankCode: string;
}

export class CancelOfferDto {
  @IsString()
  reason: string;

  @IsString()
  reasonCategory: string;
}

export class CounterOfferDto {
  @IsNumber()
  amount: number;

  @IsString()
  reason: string;
}

export class PaymentInfo {
  @IsString()
  @ValidateIf((p) => p.purpose === PaymentPurpose.JOB_OFFER)
  offerUuid: string;

  @IsString()
  @ValidateIf((p) => p.purpose === PaymentPurpose.JOB_OFFER)
  conversationUuid: string;

  @IsString()
  @ValidateIf((p) => p.purpose === PaymentPurpose.JOB_OFFER)
  description: string;

  @IsNumber()
  @Min(1)
  @ValidateIf((p) => p.purpose === PaymentPurpose.FUND_WALLET)
  amount: number;

  @IsEnum(PaymentPurpose)
  @ApiProperty({ enum: PaymentPurpose, enumName: 'PaymentPurpose' })
  purpose: PaymentPurpose;

  @IsOptional()
  @IsEnum(PaymentMethod)
  @ApiProperty({
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    required: false,
    default: PaymentMethod.PAYSTACK,
    description: 'PAYSTACK by default; WALLET only supported for JOB_OFFER',
  })
  paymentMethod?: PaymentMethod;
}

export class SwitchUserType {
  @ApiProperty({ enum: UserType, enumName: 'UserType' })
  @IsEnum(UserType)
  userType: UserType;
}

export class FeedbackDto {
  @IsString()
  title: string;

  @IsString()
  description: string;
}

export class CreateDeletionRequestDto {
  @IsString()
  reason: string;
}

export class ConfirmDeletionRequestDto {
  @IsString()
  password: string;
}

export class TopRatedProvider {
  @ApiProperty()
  uuid: string;

  @ApiProperty()
  firstname: string;

  @ApiProperty()
  lastname: string;

  @ApiProperty()
  avgRating: number;

  @ApiProperty()
  serviceDescription: string;

  @ApiProperty()
  primaryJobRole: string;

  @ApiProperty()
  offerStartingPrice: number;

  @ApiProperty()
  availability: boolean;

  @ApiProperty()
  engaged: boolean;

  @ApiProperty()
  completedJobs: number;

  @ApiProperty({ enum: AccountTier })
  tier: AccountTier;

  @ApiProperty()
  picture: string;

  @ApiProperty()
  serviceImages: string;

  @ApiProperty()
  distance: string;
}

export class ConversationDto {
  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  serviceProviderId: string;

  @ApiProperty({ required: false })
  requestorId: string;

  @ApiProperty({ required: false })
  spFirstname: string;

  @ApiProperty({ required: false })
  spLastname: string;

  @ApiProperty({ required: false })
  spMiddlename: string;

  @ApiProperty({ required: false })
  spPicture: string;

  @ApiProperty({ enum: AccountTier })
  spTier: AccountTier;

  @ApiProperty({ required: false })
  rqFirstname: string;

  @ApiProperty({ required: false })
  rqLastname: string;

  @ApiProperty({ required: false })
  rqMiddlename: string;

  @ApiProperty({ required: false })
  rqPicture: string;

  @ApiProperty({ enum: AccountTier, required: false })
  rqTier: AccountTier;

  @ApiProperty()
  lastMessageId: string;

  @ApiProperty()
  lastMessage: string;

  @ApiProperty()
  offerDescription: string;

  @ApiProperty({ enum: OfferStatus })
  status: OfferStatus;

  @ApiProperty()
  offerPrice: number;

  @ApiProperty()
  lastLockedAt: Date;

  @ApiProperty()
  locked: boolean;

  @ApiProperty()
  restricted: boolean;

  @ApiProperty()
  hasActiveJob: boolean;

  @ApiProperty()
  cancellationChances: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  iReadLastMessage: boolean;

  @ApiProperty()
  otherReadLastMessage: boolean;

  @ApiProperty()
  spOnline: boolean;

  @ApiProperty()
  srOnline: boolean;
}

export class MessageDto extends Message {
  @ApiProperty()
  readByOther: boolean;
}

const PaginatedAllProvidersDto = createPaginatedSwaggerDto(
  TopRatedProvider,
  'PaginatedAllProvidersDto',
);

export const PaginatedDisputesDto = createPaginatedSwaggerDto(
  JobDispute,
  'PaginatedDisputesDto',
);

export const PaginatedReviewsDto = createPaginatedSwaggerDto(
  JobReview,
  'PaginatedReviewsDto',
);

export const PaginatedConversationsDto = createPaginatedSwaggerDto(
  ConversationDto,
  'PaginatedConversationsDto',
);

export const PaginatedMessageDto = createPaginatedSwaggerDto(
  MessageDto,
  'PaginatedMessageDto',
);

export const PaginatedTransactionsDto = createPaginatedSwaggerDto(
  Transaction,
  'PaginatedTransactionsDto',
);

export class ProviderRatingBreakdownDto {
  @ApiProperty()
  fiveStar: number;

  @ApiProperty()
  fourStar: number;

  @ApiProperty()
  threeStar: number;

  @ApiProperty()
  twoStar: number;

  @ApiProperty()
  oneStar: number;
}

export class ProviderRatingSummaryDto {
  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty({ type: ProviderRatingBreakdownDto })
  breakdown: ProviderRatingBreakdownDto;
}

export class ClientDashboardDto {
  @ApiProperty({ type: TopRatedProvider, isArray: true })
  topRatedProviders: TopRatedProvider[];

  @ApiProperty({ type: TopRatedProvider, isArray: true })
  recommendedProviders: TopRatedProvider[];

  @ApiProperty({ type: PaginatedAllProvidersDto })
  allProviders: InstanceType<typeof PaginatedAllProvidersDto>;
}

export class ProvidersDashboardDto {
  @ApiProperty({ type: Users })
  user: Users;

  @ApiProperty()
  jobGoal: number;

  @ApiProperty()
  ratingGoal: number;

  @ApiProperty()
  todaysEarnings: number;

  @ApiProperty()
  acceptedOffers: number;

  @ApiProperty()
  acceptanceRate: number;
}

export class WithdrawFundsDto {
  @IsNumber()
  amount: number;

  @IsString()
  bankAccountUuid: string;
}
