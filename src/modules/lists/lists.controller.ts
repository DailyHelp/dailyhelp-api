import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { MainCategory, ReasonCategory } from '../admin/admin.entities';
import { ListService } from './lists.service';
import { ReasonCategoryQuery } from './lists.dto';

@Controller('lists')
@ApiTags('lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ListsController {
  constructor(private readonly listService: ListService) {}

  @Get('categories')
  @ApiOkResponse({
    type: MainCategory,
    isArray: true,
    description: 'Main categories fetched successfully',
  })
  async fetchCategories() {
    return this.listService.fetchCategories();
  }

  @Get('reason-category')
  @ApiOkResponse({
    type: ReasonCategory,
    isArray: true,
    description: 'Reason categories fetched successfully',
  })
  async fetchReasonCategories(@Query() query: ReasonCategoryQuery) {
    return this.listService.fetchReasonCategories(query.type);
  }
}
