import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

export class PaginationDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  size: number;

  @ApiProperty()
  pages: number;

  @ApiProperty()
  offset?: number;
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

export function createPaginatedSwaggerDto<
  TModel extends new (...args: any[]) => any,
>(model: TModel, name?: string) {
  class PaginatedDto {
    @ApiProperty({ type: [model] })
    @Type(() => model)
    data: InstanceType<TModel>[];

    @ApiProperty({ type: PaginationDto })
    @Type(() => PaginationDto)
    pagination: PaginationDto;
  }

  Object.defineProperty(PaginatedDto, 'name', {
    value: name ?? `Paginated${model.name}Dto`,
  });

  return PaginatedDto;
}
