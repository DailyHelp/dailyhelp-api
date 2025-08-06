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
import {
  CancelJobDto,
  DisputeJobDto,
  JobQuery,
  RateServiceProviderDto,
  VerifyJobDto,
} from './jobs.dto';
import { Request } from 'express';
import { Job } from './jobs.entity';

@Controller('customer/jobs')
@ApiTags('customer-jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CustomerJobsController {
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

  @Post(':uuid/verify-pin')
  async verifyPin(@Param('uuid') uuid: string, @Body() body: VerifyJobDto) {
    return this.jobService.verifyPin(uuid, body.pin);
  }

  @Get(':uuid/timelines')
  async fetchJobTimelines(@Param('uuid') uuid: string) {
    return this.jobService.fetchJobTimelines(uuid);
  }

  @Post(':uuid/cancel')
  async cancelJob(
    @Param('uuid') uuid: string,
    @Body() body: CancelJobDto,
    @Req() request: Request,
  ) {
    return this.jobService.cancelJob(uuid, body, request.user as any);
  }

  @Post(':uuid/start')
  async startJob(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.jobService.startJob(uuid, request.user as any);
  }

  @Post(':uuid/end')
  async endJob(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.jobService.endJob(uuid, request.user as any);
  }

  @Post(':uuid/rate-service-provider')
  async rateServiceProvider(
    @Param('uuid') uuid: string,
    @Body() body: RateServiceProviderDto,
    @Req() request: Request,
  ) {
    return this.jobService.rateServiceProvider(uuid, body, request.user as any);
  }

  @Post(':uuid/dispute')
  async disputeJob(
    @Param('uuid') uuid: string,
    @Body() body: DisputeJobDto,
    @Req() request: Request,
  ) {
    return this.jobService.disputeJob(uuid, body, request.user as any);
  }
}
