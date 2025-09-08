import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiExtraModels, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  LoginDTO,
  LoginWithGoogleDto,
  LogoutDto,
  NewResetPasswordDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SendOtpDto,
  SignupStepOneDto,
  VerifyOtpDto,
} from './auth.dto';
import { LocalAuthGuard } from 'src/guards/local-auth-guard';
import { Users } from '../users/users.entity';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { Request } from 'express';
import { extractTokenFromReq } from 'src/utils';
import { LoginResponseDto } from '../users/users.dto';
import { OTPActionType, UserType } from 'src/types';

@Controller('auth')
@ApiTags('auth')
@ApiBearerAuth()
@ApiExtraModels(SignupStepOneDto, VerifyOtpDto, SendOtpDto)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiBody({
    schema: { $ref: getSchemaPath(SignupStepOneDto) },
    examples: {
      Customer: {
        value: {
          firstname: 'Jane',
          lastname: 'Doe',
          email: 'jane@example.com',
          phone: '+2348000000000',
          password: 'Passw0rd!',
          deviceToken: 'device-token',
          type: UserType.CUSTOMER,
        },
      },
      Provider: {
        value: {
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@example.com',
          phone: '+2348111111111',
          password: 'Passw0rd!',
          deviceToken: 'device-token',
          type: UserType.PROVIDER,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'User created successfully',
    schema: {
      example: { status: true, data: { pinId: 'string', uuid: 'string' } },
    },
  })
  signupStepOne(@Body() body: SignupStepOneDto) {
    return this.authService.signupStepOne(body);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiCreatedResponse({
    description: 'User logged in successfully',
    type: LoginResponseDto,
  })
  login(@Body() _body: LoginDTO, @Req() req: any) {
    return this.authService.login(req.user);
  }

  @Post('google')
  @ApiCreatedResponse({
    description: 'User logged in successfully',
    type: LoginResponseDto,
  })
  async loginWithGoogle(@Body() { idToken }: LoginWithGoogleDto) {
    return this.authService.loginWithGoogle(idToken);
  }

  @Post('apple')
  @ApiCreatedResponse({
    description: 'User logged in successfully',
    type: LoginResponseDto,
  })
  async loginWithApple(@Body() { idToken }: LoginWithGoogleDto) {
    return this.authService.loginWithApple(idToken);
  }

  @Post('refresh')
  @ApiCreatedResponse({
    description: 'Token refreshed successfully',
    schema: {
      example: {
        status: true,
        data: {
          accessToken: 'string',
          expiresIn: 0,
          refreshToken: 'string',
        },
      },
    },
  })
  refresh(@Body() { refreshToken }: RefreshTokenDto) {
    return this.authService.refresh(refreshToken);
  }

  @Post('verify-otp')
  @ApiBody({
    schema: { $ref: getSchemaPath(VerifyOtpDto) },
    examples: {
      VerifyAccount: {
        value: {
          pinId: 'pin-id',
          otp: '123456',
          userUuid: 'user-uuid',
          otpActionType: OTPActionType.VERIFY_ACCOUNT,
        },
      },
      ResetPassword: {
        value: {
          pinId: 'pin-id',
          otp: '123456',
          userUuid: 'user-uuid',
          otpActionType: OTPActionType.RESET_PASSWORD,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'OTP verified successfully',
    schema: {
      example: {
        status: true,
        data: 'string',
      },
    },
  })
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body);
  }

  @Post('send-otp')
  @ApiBody({
    schema: { $ref: getSchemaPath(SendOtpDto) },
    examples: {
      VerifyPhone: {
        value: {
          userUuid: 'user-uuid',
          otpActionType: OTPActionType.VERIFY_PHONE,
          phone: '+2348000000000',
        },
      },
      ResetPassword: {
        value: {
          userUuid: 'user-uuid',
          otpActionType: OTPActionType.RESET_PASSWORD,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'OTP sent successfully',
    schema: { example: { status: true, data: 'string' } },
  })
  sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body);
  }

  @Post('initiate-reset-password')
  @ApiCreatedResponse({
    description: 'Password reset initiated successfully',
    schema: {
      example: { status: true, data: { pinId: 'string', userUuid: 'string' } },
    },
  })
  initiateResetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.initiateResetPassword(body);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() body: ChangePasswordDto, @Req() req: any) {
    return this.authService.changePassword(body, req.user);
  }

  @Post('reset-password')
  resetPassword(@Body() body: NewResetPasswordDto, @Req() req: Request) {
    const token = extractTokenFromReq(
      req,
      'Kindly provide a valid access token to reset your password',
    );
    return this.authService.resetPassword(body, token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body);
  }
}
