import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaginationInput } from 'src/base/dto';
import { JobStatus } from 'src/types';

export class JobFilter {
  @IsEnum(JobStatus)
  @IsOptional()
  status: JobStatus;
}

export class JobQuery {
  @ValidateNested()
  @Type(() => JobFilter)
  @IsOptional()
  filter?: JobFilter;

  @ValidateNested()
  @Type(() => PaginationInput)
  pagination?: PaginationInput;
}

export class VerifyJobDto {
  @IsNumberString()
  pin: string;
}

export class CancelJobDto {
  @IsString()
  reason: string;

  @IsString()
  reasonCategory: string;
}

export class DisputeJobDto {
  @IsString()
  reason: string;

  @IsString()
  reasonCategory: string;

  @IsString({ each: true })
  pictures: string[];

  @IsString()
  description: string;
}

export class RateServiceProviderDto {
  @IsNumber()
  rating: number;

  @IsString()
  review: string;

  @IsOptional()
  @IsNumber()
  tip: number;
}
