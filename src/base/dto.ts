import { IsEnum, IsNumberString, IsOptional } from 'class-validator';
import { OrderDir } from 'src/types';

export class BasePaginatedResponseDto {
  status: boolean;

  pagination?: {
    total: number;
    limit: number;
    page: number;
    size: number;
    pages: number;
    offset?: number;
  };

  data: any;
}

export class PaginationInput {
  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  orderBy?: string = '';

  @IsOptional()
  @IsEnum(OrderDir)
  orderDir?: OrderDir;
}
