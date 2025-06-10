import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ReasonCategoryType } from 'src/types';

export class AdminLoginDTO {
  @IsString()
  email: string;

  @IsString()
  password: string;
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

  @IsEnum(ReasonCategoryType)
  type: ReasonCategoryType;
}
