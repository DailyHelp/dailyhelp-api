import { IsEmail, IsEnum, IsString, Length, ValidateIf } from 'class-validator';
import { OTPActionType } from 'src/types';

export class SignupStepOneDto {
  @IsString()
  @Length(1, 200)
  firstname: string;

  @IsString()
  @Length(1, 200)
  lastname: string;

  @IsEmail()
  @Length(1, 200)
  email: string;

  @IsString()
  phone: string;

  @IsString()
  password: string;

  @IsString()
  deviceToken: string;
}

export class LoginDTO {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  deviceToken: string;
}

export class LoginWithGoogleDto {
  @IsString()
  idToken: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class VerifyOtpDto {
  @IsString()
  pinId: string;

  @IsString()
  otp: string;

  @IsString()
  userUuid: string;

  @IsEnum(OTPActionType)
  otpActionType: OTPActionType;
}

export class SendOtpDto {
  @IsString()
  userUuid: string;

  @IsEnum(OTPActionType)
  otpActionType: OTPActionType;

  @IsString()
  @ValidateIf((o) => o.otpActionType === OTPActionType.VERIFY_PHONE)
  phone: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(1, 50)
  newPassword: string;

  @IsString()
  @Length(1, 50)
  oldPassword: string;
}

export class NewResetPasswordDto {
  @IsString()
  @Length(1, 50)
  password: string;
}

export class LogoutDto {
  @IsString()
  refreshToken: string;

  @IsString()
  accessToken: string;
}
