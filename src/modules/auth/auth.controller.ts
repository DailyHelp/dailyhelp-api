import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
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

@Controller('auth')
@ApiTags('auth')
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiCreatedResponse({
    description: 'User created successfully',
    schema: { example: { pinId: 'string', uuid: 'string' } },
  })
  signupStepOne(@Body() body: SignupStepOneDto) {
    return this.authService.signupStepOne(body);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiCreatedResponse({
    description: 'User logged in successfully',
    schema: {
      example: {
        accessToken: 'string',
        expiresIn: 0,
        refreshToken: 'string',
        user: Users,
      },
    },
  })
  login(@Body() _body: LoginDTO, @Req() req: any) {
    return this.authService.login(req.user);
  }

  @Post('google')
  @ApiCreatedResponse({
    description: 'User logged in successfully',
    schema: {
      example: {
        accessToken: 'string',
        expiresIn: 0,
        refreshToken: 'string',
        user: Users,
      },
    },
  })
  async loginWithGoogle(@Body() { idToken }: LoginWithGoogleDto) {
    return this.authService.loginWithGoogle(idToken);
  }

  @Post('apple')
  @ApiCreatedResponse({
    description: 'User logged in successfully',
    schema: {
      example: {
        accessToken: 'string',
        expiresIn: 0,
        refreshToken: 'string',
        user: Users,
      },
    },
  })
  async loginWithApple(@Body() { idToken }: LoginWithGoogleDto) {
    return this.authService.loginWithApple(idToken);
  }

  @Post('refresh')
  @ApiCreatedResponse({
    description: 'Token refreshed successfully',
    schema: {
      example: {
        accessToken: 'string',
        expiresIn: 0,
        refreshToken: 'string',
      },
    },
  })
  refresh(@Body() { refreshToken }: RefreshTokenDto) {
    return this.authService.refresh(refreshToken);
  }

  @Post('verify-otp')
  @ApiCreatedResponse({
    description: 'OTP verified successfully',
    type: 'string',
  })
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body);
  }

  @Post('send-otp')
  @ApiCreatedResponse({ description: 'OTP sent successfully', type: 'string' })
  sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body);
  }

  @Post('initiate-reset-password')
  @ApiCreatedResponse({
    description: 'Password reset initiated successfully',
    schema: { example: { pinId: 'string', userUuid: 'string' } },
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
