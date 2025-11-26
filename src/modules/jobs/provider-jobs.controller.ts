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
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { JobService } from './jobs.service';
import { CancelJobDto, JobQuery, ReportClientDto } from './jobs.dto';
import { Job } from './jobs.entity';
import { JobStatus } from 'src/types';
import { Request } from 'express';

@Controller('provider/jobs')
@ApiTags('provider-jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiExtraModels(Job)
export class ProviderJobsController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  @ApiQuery({ name: 'pagination[page]', required: true, type: Number })
  @ApiQuery({ name: 'pagination[limit]', required: true, type: Number })
  @ApiOkResponse({
    description: 'Jobs fetched successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(Job) },
            },
          },
        },
        examples: {
          Pending: {
            summary: 'Pending job',
            value: {
              status: true,
              data: [
                {
                  uuid: 'job-pending-uuid',
                  status: JobStatus.PENDING,
                  price: 15000,
                  startDate: '2024-01-05T09:00:00.000Z',
                  endDate: null,
                  description: 'Deep cleaning scheduled and awaiting start.',
                  tip: 0,
                  serviceProvider: { uuid: 'provider-uuid' },
                  serviceRequestor: { uuid: 'customer-uuid' },
                  createdAt: '2024-01-01T12:00:00.000Z',
                  updatedAt: '2024-01-01T12:00:00.000Z',
                },
              ],
            },
          },
          InProgress: {
            summary: 'In progress job',
            value: {
              status: true,
              data: [
                {
                  uuid: 'job-in-progress-uuid',
                  status: JobStatus.IN_PROGRESS,
                  price: 30000,
                  startDate: '2024-01-10T10:30:00.000Z',
                  endDate: null,
                  description: 'Home tutoring currently ongoing.',
                  tip: 0,
                  serviceProvider: { uuid: 'provider-uuid' },
                  serviceRequestor: { uuid: 'customer-uuid' },
                  createdAt: '2024-01-08T11:00:00.000Z',
                  updatedAt: '2024-01-10T10:30:00.000Z',
                },
              ],
            },
          },
          Completed: {
            summary: 'Completed job',
            value: {
              status: true,
              data: [
                {
                  uuid: 'job-completed-uuid',
                  status: JobStatus.COMPLETED,
                  price: 25000,
                  startDate: '2023-12-01T09:00:00.000Z',
                  endDate: '2023-12-01T13:00:00.000Z',
                  description: 'Landscaping finished and approved.',
                  tip: 2000,
                  serviceProvider: { uuid: 'provider-uuid' },
                  serviceRequestor: { uuid: 'customer-uuid' },
                  createdAt: '2023-11-28T08:00:00.000Z',
                  updatedAt: '2023-12-01T13:05:00.000Z',
                },
              ],
            },
          },
          Disputed: {
            summary: 'Disputed job',
            value: {
              status: true,
              data: [
                {
                  uuid: 'job-disputed-uuid',
                  status: JobStatus.DISPUTED,
                  price: 18000,
                  startDate: '2023-11-15T14:00:00.000Z',
                  endDate: '2023-11-15T16:30:00.000Z',
                  description: 'Issue raised regarding final inspection.',
                  tip: 0,
                  serviceProvider: { uuid: 'provider-uuid' },
                  serviceRequestor: { uuid: 'customer-uuid' },
                  createdAt: '2023-11-10T09:45:00.000Z',
                  updatedAt: '2023-11-15T17:00:00.000Z',
                },
              ],
            },
          },
          Canceled: {
            summary: 'Canceled job',
            value: {
              status: true,
              data: [
                {
                  uuid: 'job-canceled-uuid',
                  status: JobStatus.CANCELED,
                  price: 12000,
                  startDate: '2023-10-12T08:00:00.000Z',
                  endDate: null,
                  description: 'Job canceled by client due to schedule change.',
                  tip: 0,
                  cancellationReason: 'Client rescheduled',
                  cancellationCategory: 'CLIENT',
                  serviceProvider: { uuid: 'provider-uuid' },
                  serviceRequestor: { uuid: 'customer-uuid' },
                  createdAt: '2023-10-10T07:30:00.000Z',
                  updatedAt: '2023-10-11T15:20:00.000Z',
                },
              ],
            },
          },
        },
      },
    },
  })
  async fetchJobs(@Query() query: JobQuery, @Req() request: Request) {
    return this.jobService.fetchJobs(
      query.pagination,
      query.filter,
      request.user as any,
    );
  }

  @Post(':uuid/call-token')
  @ApiOkResponse({
    description: 'Call token generated successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                appId: { type: 'string', example: 'your-agora-app-id' },
                channel: { type: 'string', example: 'job-a1b2c3d4' },
                token: { type: 'string', example: '006appId...agoraToken' },
                uid: { type: 'string', example: 'user-uuid' },
                expiresAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-01-12T10:00:00.000Z',
                },
                ttlSeconds: { type: 'number', example: 3600 },
              },
            },
          },
        },
      },
    },
  })
  async generateCallToken(
    @Param('uuid') uuid: string,
    @Req() request: Request,
  ) {
    return this.jobService.generateCallToken(uuid, request.user as any);
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

  @Post(':uuid/report-client')
  async reportClient(
    @Param('uuid') uuid: string,
    @Body() body: ReportClientDto,
    @Req() request: Request,
  ) {
    return this.jobService.reportClient(uuid, body, request.user as any);
  }
}
