import {
  IsBoolean,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Users } from './users.entity';
import { Type } from 'class-transformer';
import { PaginationInput } from 'src/base/dto';

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
  lat: number;

  @IsNumber()
  lng: number;

  @IsBoolean()
  default: boolean;
}

export class SavePricesDto {
  @IsNumber()
  offerStartingPrice: number;

  @IsNumber()
  minimumOfferPrice: number;
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
