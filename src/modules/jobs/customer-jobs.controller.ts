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
  @ApiOkResponse({
    description: 'Job timelines fetched successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  uuid: { type: 'string', example: 'timeline-entry-uuid' },
                  event: {
                    type: 'string',
                    example: 'Job Created',
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-01-10T09:15:32.000Z',
                  },
                  updatedAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-01-10T09:15:32.000Z',
                  },
                  actor: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      uuid: { type: 'string', example: 'user-uuid' },
                      firstname: { type: 'string', example: 'Ada' },
                      lastname: { type: 'string', example: 'Okafor' },
                      middlename: {
                        type: 'string',
                        nullable: true,
                        example: null,
                      },
                      picture: {
                        type: 'string',
                        nullable: true,
                        example: 'https://cdn.dailyhelp.ng/users/ada.png',
                      },
                      email: {
                        type: 'string',
                        nullable: true,
                        example: 'ada@example.com',
                      },
                      phone: {
                        type: 'string',
                        nullable: true,
                        example: '+2348012345678',
                      },
                      userType: {
                        type: 'string',
                        enum: ['CUSTOMER', 'PROVIDER'],
                        example: 'CUSTOMER',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        example: {
          status: true,
          data: [
            {
              uuid: 'timeline-created-uuid',
              event: 'Job Created',
              createdAt: '2025-01-10T09:15:32.000Z',
              updatedAt: '2025-01-10T09:15:32.000Z',
              actor: {
                uuid: 'customer-uuid',
                firstname: 'Ada',
                lastname: 'Okafor',
                middlename: null,
                picture: null,
                email: 'ada@example.com',
                phone: '+2348012345678',
                userType: 'CUSTOMER',
              },
            },
            {
              uuid: 'timeline-accepted-uuid',
              event: 'Job Accepted',
              createdAt: '2025-01-11T08:00:00.000Z',
              updatedAt: '2025-01-11T08:00:00.000Z',
              actor: {
                uuid: 'provider-uuid',
                firstname: 'Musa',
                lastname: 'Hassan',
                middlename: null,
                picture: 'https://cdn.dailyhelp.ng/users/musa.png',
                email: 'musa@example.com',
                phone: '+2348098765432',
                userType: 'PROVIDER',
              },
            },
          ],
        },
      },
    },
  })
  async fetchJobTimelines(@Param('uuid') uuid: string) {
    return this.jobService.fetchJobTimelines(uuid);
  }

  @Get(':uuid')
  @ApiOkResponse({
    description: 'Job details fetched successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                job: { type: 'object' },
                timelines: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
        example: {
          status: true,
          data: {
            job: {
              uuid: 'job-uuid',
              status: 'IN_PROGRESS',
              requestId: 'REQ-2025-0012',
              price: 45000,
              startDate: '2025-01-12T09:00:00.000Z',
              endDate: null,
              description: 'Full apartment deep cleaning with laundry.',
              pictures: null,
              tip: 0,
              code: '7821',
              acceptedAt: '2025-01-11T15:30:00.000Z',
              cancelledAt: null,
              cancellationReason: null,
              cancellationCategory: null,
              createdAt: '2025-01-10T09:12:00.000Z',
              updatedAt: '2025-01-11T15:30:00.000Z',
              serviceProvider: {
                uuid: 'provider-uuid',
                firstname: 'Musa',
                lastname: 'Hassan',
                middlename: null,
                picture: 'https://cdn.dailyhelp.ng/providers/musa.png',
                email: 'musa@example.com',
                phone: '+2348098765432',
                userType: 'PROVIDER',
              },
              serviceRequestor: {
                uuid: 'customer-uuid',
                firstname: 'Ada',
                lastname: 'Okafor',
                middlename: null,
                picture: null,
                email: 'ada@example.com',
                phone: '+2348012345678',
                userType: 'CUSTOMER',
              },
              review: null,
              dispute: null,
              payment: {
                uuid: 'payment-uuid',
                amount: 45000,
                status: 'processing',
                type: 'JOB',
                currency: 'NGN',
                processedAt: '2025-01-11T15:35:00.000Z',
              },
            },
            timelines: [
              {
                uuid: 'timeline-created-uuid',
                event: 'Job Created',
                createdAt: '2025-01-10T09:15:32.000Z',
                updatedAt: '2025-01-10T09:15:32.000Z',
                actor: {
                  uuid: 'customer-uuid',
                  firstname: 'Ada',
                  lastname: 'Okafor',
                  middlename: null,
                  picture: null,
                  email: 'ada@example.com',
                  phone: '+2348012345678',
                  userType: 'CUSTOMER',
                },
              },
              {
                uuid: 'timeline-accepted-uuid',
                event: 'Job Accepted',
                createdAt: '2025-01-11T08:00:00.000Z',
                updatedAt: '2025-01-11T08:00:00.000Z',
                actor: {
                  uuid: 'provider-uuid',
                  firstname: 'Musa',
                  lastname: 'Hassan',
                  middlename: null,
                  picture: 'https://cdn.dailyhelp.ng/providers/musa.png',
                  email: 'musa@example.com',
                  phone: '+2348098765432',
                  userType: 'PROVIDER',
                },
              },
            ],
          },
        },
      },
    },
  })
  async fetchJobDetail(@Param('uuid') uuid: string, @Req() request: Request) {
    return this.jobService.fetchJobDetail(uuid, request.user as any);
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
