import { IsString } from 'class-validator';
import { Users } from './users.entity';

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
