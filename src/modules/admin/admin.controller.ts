import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/jwt-auth-guard';
import { AdminService } from './admin.service';
import { AllowUnauthorizedRequest } from 'src/decorators/unauthorized.decorator';
import { AdminLocalAuthGuard } from './guards/local-auth-guard';
import * as dtos from './dto';
import { MainCategory, SubCategory } from './admin.entities';

@Controller('admin')
@ApiTags('admin')
@UseGuards(AdminJwtAuthGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  getHello(): string {
    return 'Welcome to DailyHelp Admin!!!';
  }

  @Post('auth/login')
  @AllowUnauthorizedRequest()
  @UseGuards(AdminLocalAuthGuard)
  login(@Body() _body: dtos.AdminLoginDTO, @Req() req: any) {
    return this.service.login(req.user);
  }

  @Post('user')
  createUser(@Body() body: dtos.AdminUserDto) {
    return this.service.createUser(body);
  }

  @Post('main-category')
  createMainCategory(@Body() body: dtos.CreateMainCategory) {
    return this.service.createMainCategory(body);
  }

  @Get('main-categories')
  @ApiOkResponse({
    type: MainCategory,
    isArray: true,
    description: 'Main categories fetched successfully',
  })
  fetchMainCategories() {
    return this.service.fetchMainCategories();
  }

  @Post('main-category/:uuid/edit')
  editMainCategory(
    @Param('uuid') uuid: string,
    @Body() body: dtos.UpdateMainCategory,
  ) {
    return this.service.editMainCategory(uuid, body);
  }

  @Post('main-category/:uuid/delete')
  deleteMainCategory(@Param('uuid') uuid: string) {
    return this.service.deleteMainCategory(uuid);
  }

  @Post('sub-category')
  createSubCategory(@Body() body: dtos.CreateSubCategory) {
    return this.service.createSubCategory(body);
  }

  @Get('main-category/:uuid/sub-categories')
  @ApiOkResponse({
    type: SubCategory,
    isArray: true,
    description: 'Sub categories fetched successfully',
  })
  fetchSubCategories(@Param('uuid') uuid: string) {
    return this.service.fetchSubCategories(uuid);
  }

  @Post('sub-category/:uuid/edit')
  editSubCategory(
    @Param('uuid') uuid: string,
    @Body() body: dtos.UpdateSubCategory,
  ) {
    return this.service.editSubCategory(uuid, body);
  }

  @Post('sub-category/:uuid/delete')
  deleteSubCategory(@Param('uuid') uuid: string) {
    return this.service.deleteSubCategory(uuid);
  }

  @Post('reason-category')
  reasonCategory(@Body() body: dtos.CreateReasonCategory) {
    return this.service.createReasonCategory(body);
  }

  @Post('reason-category/:uuid/delete')
  deleteReasonCategory(@Param('uuid') uuid: string) {
    return this.service.deleteReasonCategory(uuid);
  }
}
