import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaginationInput } from 'src/base/dto';
import { JobStatus } from 'src/types';
import { ApiProperty } from '@nestjs/swagger';

export class JobFilter {
  @ApiProperty({ enum: JobStatus, enumName: 'JobStatus', required: false })
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
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reasonCategory?: string;
}

export class ReportClientDto {
  @IsString()
  reportCategory: string;

  @IsString()
  description: string;

  @IsString({ each: true })
  pictures: string[];
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

export class UpdateProviderIdentityVerificationDto {
  @ApiProperty()
  @IsBoolean()
  verified: boolean;
}
