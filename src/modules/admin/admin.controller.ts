import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/jwt-auth-guard';
import { AdminService } from './admin.service';
import { AllowUnauthorizedRequest } from 'src/decorators/unauthorized.decorator';
import { AdminLocalAuthGuard } from './guards/local-auth-guard';

@Controller('admin')
@ApiTags('admin')
@UseGuards(AdminJwtAuthGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  getHello(): string {
    return 'Welcome to DailyHelp Admin!!!';
  }

  // @Post('auth/login')
  // @AllowUnauthorizedRequest()
  // @UseGuards(AdminLocalAuthGuard)
  // login(@Body() _body: dtos.AdminLoginDTO, @Req() req: any) {
  //   return this.service.login(req.user);
  // }

  // @Post('user')
  // createUser(@Body() body: dtos.AdminUserDto) {
  //   return this.service.createUser(body);
  // }
}
