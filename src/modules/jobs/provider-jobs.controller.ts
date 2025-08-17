import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { JobService } from './jobs.service';
import { CancelJobDto, JobQuery, ReportClientDto } from './jobs.dto';
import { Job } from './jobs.entity';
import { Request } from 'express';

@Controller('provider/jobs')
@ApiTags('provider-jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProviderJobsController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  @ApiOkResponse({
    type: Job,
    description: 'Jobs fetched successfully',
  })
  async fetchJobs(@Query() query: JobQuery, @Req() request: Request) {
    return this.jobService.fetchJobs(
      query.pagination,
      query.filter,
      request.user as any,
    );
  }

  @Post(':uuid/cancel')
  async cancelJob(
    @Param('uuid') uuid: string,
    @Body() body: CancelJobDto,
    @Req() request: Request,
  ) {
    return this.jobService.cancelJob(uuid, body, request.user as any);
  }

  @Post(':uuid/report-client')
  async reportClient(
    @Param('uuid') uuid: string,
    @Body() body: ReportClientDto,
    @Req() request: Request,
  ) {
    return this.jobService.reportClient(uuid, body, request.user as any);
  }
}
