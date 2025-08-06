import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Users } from './users.entity';
import { Type } from 'class-transformer';
import { createPaginatedSwaggerDto, PaginationInput } from 'src/base/dto';
import { AccountTier, OfferStatus, PaymentPurpose, UserType } from 'src/types';
import { ApiProperty } from '@nestjs/swagger';
import { JobDispute } from '../jobs/job-dispute.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { Message } from 'src/entities/message.entity';

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
  subCategoryUuid: string;

  @IsString()
  serviceDescription: string;

  @IsString()
  serviceImages: string;
}

export class PriceFilter {
  @IsOptional()
  @IsNumberString()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumberString()
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
  @IsNumberString()
  @Type(() => Number)
  minRating?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumberString()
  @Type(() => Number)
  longitude?: number;
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
  description: string;

  @IsNumber()
  @Min(1)
  @ValidateIf((p) => p.purpose === PaymentPurpose.FUND_WALLET)
  amount: number;

  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;
}

export class SwitchUserType {
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
  spFirstname: string;

  @ApiProperty({ required: false })
  spLastname: string;

  @ApiProperty({ required: false })
  spMiddlename: string;

  @ApiProperty({ required: false })
  rqFirstname: string;

  @ApiProperty({ required: false })
  rqLastname: string;

  @ApiProperty({ required: false })
  rqMiddlename: string;

  @ApiProperty()
  lastMessageId: string;

  @ApiProperty()
  lastMessage: string;

  @ApiProperty()
  offerDescription: string;

  @ApiProperty({ enum: OfferStatus })
  status: OfferStatus;

  @ApiProperty()
  lastLockedAt: Date;

  @ApiProperty()
  locked: boolean;

  @ApiProperty()
  restricted: boolean;

  @ApiProperty()
  cancellationChances: number;

  @ApiProperty()
  createdAt: Date;
}

const PaginatedAllProvidersDto = createPaginatedSwaggerDto(TopRatedProvider);

export const PaginatedDisputesDto = createPaginatedSwaggerDto(JobDispute);

export const PaginatedReviewsDto = createPaginatedSwaggerDto(JobReview);

export const PaginatedConversationsDto =
  createPaginatedSwaggerDto(ConversationDto);

export const PaginatedMessageDto = createPaginatedSwaggerDto(Message);

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
  todaysEarnings: number;

  @ApiProperty()
  acceptedOffers: number;

  @ApiProperty()
  acceptanceRate: number;
}
