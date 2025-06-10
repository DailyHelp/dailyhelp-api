import { IsEnum, IsOptional } from 'class-validator';
import { ReasonCategoryType } from 'src/types';

export class ReasonCategoryQuery {
  @IsOptional()
  @IsEnum(ReasonCategoryType)
  type: ReasonCategoryType;
}
