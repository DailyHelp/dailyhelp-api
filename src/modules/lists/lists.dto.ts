import { IsEnum, IsOptional } from 'class-validator';
import { ReasonCategoryType } from 'src/types';
import { ApiProperty } from '@nestjs/swagger';

export class ReasonCategoryQuery {
  @IsOptional()
  @ApiProperty({ enum: ReasonCategoryType, enumName: 'ReasonCategoryType', required: false })
  @IsEnum(ReasonCategoryType)
  type: ReasonCategoryType;
}
