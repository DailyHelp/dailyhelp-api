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
import {
  CancelJobDto,
  JobQuery,
  ReportClientDto,
} from './jobs.dto';
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
    @Param('uuid') conversationUuid: string,
    @Req() request: Request,
  ) {
    return this.jobService.generateCallToken(
      conversationUuid,
      request.user as any,
    );
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
  async fetchJobTimelines(
    @Param('uuid') uuid: string,
    @Req() request: Request,
  ) {
    return this.jobService.fetchJobTimelines(uuid, request.user as any);
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
                job: {
                  type: 'object',
                  properties: {
                    uuid: { type: 'string', example: 'job-uuid' },
                    status: {
                      type: 'string',
                      enum: [
                        'PENDING',
                        'IN_PROGRESS',
                        'COMPLETED',
                        'DISPUTED',
                        'CANCELED',
                      ],
                      example: 'COMPLETED',
                    },
                    requestId: { type: 'string', example: 'REQ-2025-0012' },
                    price: { type: 'number', example: 45000 },
                    startDate: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-01-12T09:00:00.000Z',
                    },
                    endDate: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-01-12T13:30:00.000Z',
                    },
                    description: {
                      type: 'string',
                      example: 'Full apartment deep cleaning with laundry.',
                    },
                    pictures: {
                      type: 'array',
                      items: { type: 'string' },
                      example: [
                        'https://cdn.dailyhelp.ng/jobs/req0012/living-room.png',
                        'https://cdn.dailyhelp.ng/jobs/req0012/kitchen.png',
                      ],
                    },
                    tip: { type: 'number', example: 5000 },
                    code: { type: 'string', example: '7821' },
                    providerIdentityVerified: {
                      type: 'boolean',
                      example: true,
                    },
                    acceptedAt: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-01-11T15:30:00.000Z',
                    },
                    cancelledAt: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-01-10T12:45:00.000Z',
                    },
                    cancellationReason: {
                      type: 'string',
                      example: 'Client rescheduled for a later date.',
                    },
                    cancellationCategory: {
                      type: 'string',
                      example: 'CLIENT',
                    },
                    createdAt: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-01-10T09:12:00.000Z',
                    },
                    updatedAt: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-01-12T13:35:00.000Z',
                    },
                    serviceProvider: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        uuid: { type: 'string', example: 'provider-uuid' },
                        firstname: { type: 'string', example: 'Musa' },
                        lastname: { type: 'string', example: 'Hassan' },
                        middlename: { type: 'string', example: 'Aliu' },
                        picture: {
                          type: 'string',
                          example: 'https://cdn.dailyhelp.ng/providers/musa.png',
                        },
                        email: { type: 'string', example: 'musa@example.com' },
                        phone: {
                          type: 'string',
                          example: '+2348098765432',
                        },
                        userType: {
                          type: 'string',
                          enum: ['CUSTOMER', 'PROVIDER'],
                          example: 'PROVIDER',
                        },
                        userTypes: {
                          type: 'string',
                          example: 'PROVIDER,PARTNER',
                        },
                      },
                    },
                    serviceRequestor: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        uuid: { type: 'string', example: 'customer-uuid' },
                        firstname: { type: 'string', example: 'Ada' },
                        lastname: { type: 'string', example: 'Okafor' },
                        middlename: { type: 'string', example: 'Chioma' },
                        picture: {
                          type: 'string',
                          example: 'https://cdn.dailyhelp.ng/customers/ada.png',
                        },
                        email: { type: 'string', example: 'ada@example.com' },
                        phone: {
                          type: 'string',
                          example: '+2348012345678',
                        },
                        userType: {
                          type: 'string',
                          enum: ['CUSTOMER', 'PROVIDER'],
                          example: 'CUSTOMER',
                        },
                        userTypes: { type: 'string', example: 'CUSTOMER' },
                      },
                    },
                    review: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        uuid: { type: 'string', example: 'review-uuid' },
                        rating: { type: 'number', example: 4.8 },
                        review: {
                          type: 'string',
                          example: 'Great attention to detail, arrived on time.',
                        },
                        createdAt: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-01-12T14:00:00.000Z',
                        },
                        updatedAt: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-01-12T14:00:00.000Z',
                        },
                        reviewedBy: {
                          type: 'object',
                          nullable: true,
                          properties: {
                            uuid: { type: 'string', example: 'customer-uuid' },
                            firstname: { type: 'string', example: 'Ada' },
                            lastname: { type: 'string', example: 'Okafor' },
                            middlename: { type: 'string', example: 'Chioma' },
                            picture: {
                              type: 'string',
                              example:
                                'https://cdn.dailyhelp.ng/customers/ada.png',
                            },
                            email: {
                              type: 'string',
                              example: 'ada@example.com',
                            },
                            phone: {
                              type: 'string',
                              example: '+2348012345678',
                            },
                            userType: {
                              type: 'string',
                              enum: ['CUSTOMER', 'PROVIDER'],
                              example: 'CUSTOMER',
                            },
                            userTypes: { type: 'string', example: 'CUSTOMER' },
                          },
                        },
                        reviewedFor: {
                          type: 'object',
                          nullable: true,
                          properties: {
                            uuid: { type: 'string', example: 'provider-uuid' },
                            firstname: { type: 'string', example: 'Musa' },
                            lastname: { type: 'string', example: 'Hassan' },
                            middlename: { type: 'string', example: 'Aliu' },
                            picture: {
                              type: 'string',
                              example:
                                'https://cdn.dailyhelp.ng/providers/musa.png',
                            },
                            email: {
                              type: 'string',
                              example: 'musa@example.com',
                            },
                            phone: {
                              type: 'string',
                              example: '+2348098765432',
                            },
                            userType: {
                              type: 'string',
                              enum: ['CUSTOMER', 'PROVIDER'],
                              example: 'PROVIDER',
                            },
                            userTypes: {
                              type: 'string',
                              example: 'PROVIDER,PARTNER',
                            },
                          },
                        },
                      },
                    },
                    dispute: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        uuid: { type: 'string', example: 'dispute-uuid' },
                        status: {
                          type: 'string',
                          example: 'OPEN',
                        },
                        category: {
                          type: 'string',
                          example: 'SERVICE_QUALITY',
                        },
                        description: {
                          type: 'string',
                          example:
                            'Client reported scratches on the table after cleaning.',
                        },
                        createdAt: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-01-12T14:15:00.000Z',
                        },
                        updatedAt: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-01-12T14:30:00.000Z',
                        },
                      },
                    },
                    payment: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        uuid: { type: 'string', example: 'payment-uuid' },
                        amount: { type: 'number', example: 45000 },
                        status: { type: 'string', example: 'success' },
                        type: { type: 'string', example: 'JOB' },
                        currency: { type: 'string', example: 'NGN' },
                        processedAt: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-01-11T15:35:00.000Z',
                        },
                      },
                    },
                  },
                },
                timelines: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      uuid: { type: 'string', example: 'timeline-entry-uuid' },
                      event: { type: 'string', example: 'Job Created' },
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
                          uuid: { type: 'string', example: 'actor-uuid' },
                          firstname: { type: 'string', example: 'Ada' },
                          lastname: { type: 'string', example: 'Okafor' },
                          middlename: { type: 'string', example: 'Chioma' },
                          picture: {
                            type: 'string',
                            example: 'https://cdn.dailyhelp.ng/users/ada.png',
                          },
                          email: {
                            type: 'string',
                            example: 'ada@example.com',
                          },
                          phone: {
                            type: 'string',
                            example: '+2348012345678',
                          },
                          userType: {
                            type: 'string',
                            enum: ['CUSTOMER', 'PROVIDER'],
                            example: 'CUSTOMER',
                          },
                          userTypes: {
                            type: 'string',
                            example: 'CUSTOMER',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        examples: {
          CompletedJobWithReview: {
            summary: 'Completed job with review and payment',
            value: {
              status: true,
              data: {
                job: {
                  uuid: 'job-completed-uuid',
                  status: 'COMPLETED',
                  requestId: 'REQ-2025-0012',
                  price: 45000,
                  startDate: '2025-01-12T09:00:00.000Z',
                  endDate: '2025-01-12T13:30:00.000Z',
                  description: 'Full apartment deep cleaning with laundry.',
                  pictures: [
                    'https://cdn.dailyhelp.ng/jobs/req0012/living-room.png',
                    'https://cdn.dailyhelp.ng/jobs/req0012/kitchen.png',
                  ],
                  tip: 5000,
                  code: '7821',
                  providerIdentityVerified: true,
                  acceptedAt: '2025-01-11T15:30:00.000Z',
                  cancelledAt: '2025-01-10T12:45:00.000Z',
                  cancellationReason: 'Client rescheduled for a later date.',
                  cancellationCategory: 'CLIENT',
                  createdAt: '2025-01-10T09:12:00.000Z',
                  updatedAt: '2025-01-12T13:35:00.000Z',
                  serviceProvider: {
                    uuid: 'provider-uuid',
                    firstname: 'Musa',
                    lastname: 'Hassan',
                    middlename: 'Aliu',
                    picture: 'https://cdn.dailyhelp.ng/providers/musa.png',
                    email: 'musa@example.com',
                    phone: '+2348098765432',
                    userType: 'PROVIDER',
                    userTypes: 'PROVIDER,PARTNER',
                  },
                  serviceRequestor: {
                    uuid: 'customer-uuid',
                    firstname: 'Ada',
                    lastname: 'Okafor',
                    middlename: 'Chioma',
                    picture: 'https://cdn.dailyhelp.ng/customers/ada.png',
                    email: 'ada@example.com',
                    phone: '+2348012345678',
                    userType: 'CUSTOMER',
                    userTypes: 'CUSTOMER',
                  },
                  review: {
                    uuid: 'review-uuid',
                    rating: 4.8,
                    review:
                      'Great attention to detail, arrived on time and cleaned thoroughly.',
                    createdAt: '2025-01-12T14:00:00.000Z',
                    updatedAt: '2025-01-12T14:00:00.000Z',
                    reviewedBy: {
                      uuid: 'customer-uuid',
                      firstname: 'Ada',
                      lastname: 'Okafor',
                      middlename: 'Chioma',
                      picture: 'https://cdn.dailyhelp.ng/customers/ada.png',
                      email: 'ada@example.com',
                      phone: '+2348012345678',
                      userType: 'CUSTOMER',
                      userTypes: 'CUSTOMER',
                    },
                    reviewedFor: {
                      uuid: 'provider-uuid',
                      firstname: 'Musa',
                      lastname: 'Hassan',
                      middlename: 'Aliu',
                      picture: 'https://cdn.dailyhelp.ng/providers/musa.png',
                      email: 'musa@example.com',
                      phone: '+2348098765432',
                      userType: 'PROVIDER',
                      userTypes: 'PROVIDER,PARTNER',
                    },
                  },
                  dispute: {
                    uuid: 'dispute-uuid',
                    status: 'RESOLVED',
                    category: 'SERVICE_QUALITY',
                    description:
                      'Scratch on dining table was reviewed and resolved.',
                    createdAt: '2025-01-12T14:15:00.000Z',
                    updatedAt: '2025-01-12T14:45:00.000Z',
                  },
                  payment: {
                    uuid: 'payment-uuid',
                    amount: 45000,
                    status: 'success',
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
                      middlename: 'Chioma',
                      picture: 'https://cdn.dailyhelp.ng/customers/ada.png',
                      email: 'ada@example.com',
                      phone: '+2348012345678',
                      userType: 'CUSTOMER',
                      userTypes: 'CUSTOMER',
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
                      middlename: 'Aliu',
                      picture: 'https://cdn.dailyhelp.ng/providers/musa.png',
                      email: 'musa@example.com',
                      phone: '+2348098765432',
                      userType: 'PROVIDER',
                      userTypes: 'PROVIDER,PARTNER',
                    },
                  },
                  {
                    uuid: 'timeline-started-uuid',
                    event: 'Job Started',
                    createdAt: '2025-01-12T09:00:00.000Z',
                    updatedAt: '2025-01-12T09:00:00.000Z',
                    actor: {
                      uuid: 'provider-uuid',
                      firstname: 'Musa',
                      lastname: 'Hassan',
                      middlename: 'Aliu',
                      picture: 'https://cdn.dailyhelp.ng/providers/musa.png',
                      email: 'musa@example.com',
                      phone: '+2348098765432',
                      userType: 'PROVIDER',
                      userTypes: 'PROVIDER,PARTNER',
                    },
                  },
                  {
                    uuid: 'timeline-completed-uuid',
                    event: 'Job Completed',
                    createdAt: '2025-01-12T13:30:00.000Z',
                    updatedAt: '2025-01-12T13:30:00.000Z',
                    actor: {
                      uuid: 'customer-uuid',
                      firstname: 'Ada',
                      lastname: 'Okafor',
                      middlename: 'Chioma',
                      picture: 'https://cdn.dailyhelp.ng/customers/ada.png',
                      email: 'ada@example.com',
                      phone: '+2348012345678',
                      userType: 'CUSTOMER',
                      userTypes: 'CUSTOMER',
                    },
                  },
                ],
              },
            },
          },
          DisputedJob: {
            summary: 'Disputed job with open case',
            value: {
              status: true,
              data: {
                job: {
                  uuid: 'job-disputed-uuid',
                  status: 'DISPUTED',
                  requestId: 'REQ-2025-0042',
                  price: 30000,
                  startDate: '2025-02-02T10:00:00.000Z',
                  endDate: '2025-02-02T12:00:00.000Z',
                  description: 'Two-hour home tutoring session.',
                  pictures: [
                    'https://cdn.dailyhelp.ng/jobs/req0042/whiteboard.png',
                  ],
                  tip: 0,
                  code: '6149',
                  providerIdentityVerified: true,
                  acceptedAt: '2025-02-01T18:00:00.000Z',
                  cancelledAt: '2025-02-02T12:30:00.000Z',
                  cancellationReason:
                    'Customer paused the session pending dispute.',
                  cancellationCategory: 'SERVICE_PROVIDER',
                  createdAt: '2025-01-31T16:10:00.000Z',
                  updatedAt: '2025-02-02T12:45:00.000Z',
                  serviceProvider: {
                    uuid: 'provider-uuid-2',
                    firstname: 'Ifeoma',
                    lastname: 'Eze',
                    middlename: 'Chidinma',
                    picture: 'https://cdn.dailyhelp.ng/providers/ifeoma.png',
                    email: 'ifeoma@example.com',
                    phone: '+2347012345678',
                    userType: 'PROVIDER',
                    userTypes: 'PROVIDER',
                  },
                  serviceRequestor: {
                    uuid: 'customer-uuid-2',
                    firstname: 'David',
                    lastname: 'Balogun',
                    middlename: 'Oluwaseun',
                    picture: 'https://cdn.dailyhelp.ng/customers/david.png',
                    email: 'david@example.com',
                    phone: '+2348024681234',
                    userType: 'CUSTOMER',
                    userTypes: 'CUSTOMER',
                  },
                  review: {
                    uuid: 'review-uuid-2',
                    rating: 3.5,
                    review: 'Session interrupted; waiting for resolution.',
                    createdAt: '2025-02-02T12:35:00.000Z',
                    updatedAt: '2025-02-02T12:35:00.000Z',
                    reviewedBy: {
                      uuid: 'customer-uuid-2',
                      firstname: 'David',
                      lastname: 'Balogun',
                      middlename: 'Oluwaseun',
                      picture: 'https://cdn.dailyhelp.ng/customers/david.png',
                      email: 'david@example.com',
                      phone: '+2348024681234',
                      userType: 'CUSTOMER',
                      userTypes: 'CUSTOMER',
                    },
                    reviewedFor: {
                      uuid: 'provider-uuid-2',
                      firstname: 'Ifeoma',
                      lastname: 'Eze',
                      middlename: 'Chidinma',
                      picture: 'https://cdn.dailyhelp.ng/providers/ifeoma.png',
                      email: 'ifeoma@example.com',
                      phone: '+2347012345678',
                      userType: 'PROVIDER',
                      userTypes: 'PROVIDER',
                    },
                  },
                  dispute: {
                    uuid: 'dispute-uuid-2',
                    status: 'OPEN',
                    category: 'SERVICE_QUALITY',
                    description:
                      'Student reported tutor skipped agreed topics.',
                    createdAt: '2025-02-02T12:20:00.000Z',
                    updatedAt: '2025-02-02T12:45:00.000Z',
                  },
                  payment: {
                    uuid: 'payment-uuid-2',
                    amount: 30000,
                    status: 'pending',
                    type: 'JOB',
                    currency: 'NGN',
                    processedAt: '2025-02-02T12:05:00.000Z',
                  },
                },
                timelines: [
                  {
                    uuid: 'timeline-created-uuid-2',
                    event: 'Job Created',
                    createdAt: '2025-01-31T16:10:00.000Z',
                    updatedAt: '2025-01-31T16:10:00.000Z',
                    actor: {
                      uuid: 'customer-uuid-2',
                      firstname: 'David',
                      lastname: 'Balogun',
                      middlename: 'Oluwaseun',
                      picture: 'https://cdn.dailyhelp.ng/customers/david.png',
                      email: 'david@example.com',
                      phone: '+2348024681234',
                      userType: 'CUSTOMER',
                      userTypes: 'CUSTOMER',
                    },
                  },
                  {
                    uuid: 'timeline-accepted-uuid-2',
                    event: 'Job Accepted',
                    createdAt: '2025-02-01T18:00:00.000Z',
                    updatedAt: '2025-02-01T18:00:00.000Z',
                    actor: {
                      uuid: 'provider-uuid-2',
                      firstname: 'Ifeoma',
                      lastname: 'Eze',
                      middlename: 'Chidinma',
                      picture: 'https://cdn.dailyhelp.ng/providers/ifeoma.png',
                      email: 'ifeoma@example.com',
                      phone: '+2347012345678',
                      userType: 'PROVIDER',
                      userTypes: 'PROVIDER',
                    },
                  },
                  {
                    uuid: 'timeline-dispute-uuid-2',
                    event: 'Job Disputed',
                    createdAt: '2025-02-02T12:20:00.000Z',
                    updatedAt: '2025-02-02T12:20:00.000Z',
                    actor: {
                      uuid: 'customer-uuid-2',
                      firstname: 'David',
                      lastname: 'Balogun',
                      middlename: 'Oluwaseun',
                      picture: 'https://cdn.dailyhelp.ng/customers/david.png',
                      email: 'david@example.com',
                      phone: '+2348024681234',
                      userType: 'CUSTOMER',
                      userTypes: 'CUSTOMER',
                    },
                  },
                ],
              },
            },
          },
          CanceledJob: {
            summary: 'Canceled job with refund in progress',
            value: {
              status: true,
              data: {
                job: {
                  uuid: 'job-canceled-uuid',
                  status: 'CANCELED',
                  requestId: 'REQ-2025-0099',
                  price: 28000,
                  startDate: '2025-03-05T08:00:00.000Z',
                  endDate: '2025-03-05T08:00:00.000Z',
                  description: 'Early morning airport pickup.',
                  pictures: [
                    'https://cdn.dailyhelp.ng/jobs/req0099/route-map.png',
                  ],
                  tip: 0,
                  code: '3312',
                  providerIdentityVerified: true,
                  acceptedAt: '2025-03-04T18:00:00.000Z',
                  cancelledAt: '2025-03-05T06:30:00.000Z',
                  cancellationReason: 'Flight delayed, ride canceled by client.',
                  cancellationCategory: 'CLIENT',
                  createdAt: '2025-03-04T12:30:00.000Z',
                  updatedAt: '2025-03-05T06:30:00.000Z',
                  serviceProvider: {
                    uuid: 'provider-uuid-3',
                    firstname: 'Tomiwa',
                    lastname: 'Adeyemi',
                    middlename: 'Kayode',
                    picture: 'https://cdn.dailyhelp.ng/providers/tomiwa.png',
                    email: 'tomiwa@example.com',
                    phone: '+2348034567890',
                    userType: 'PROVIDER',
                    userTypes: 'PROVIDER',
                  },
                  serviceRequestor: {
                    uuid: 'customer-uuid-3',
                    firstname: 'Zainab',
                    lastname: 'Yusuf',
                    middlename: 'Aisha',
                    picture: 'https://cdn.dailyhelp.ng/customers/zainab.png',
                    email: 'zainab@example.com',
                    phone: '+2348054321987',
                    userType: 'CUSTOMER',
                    userTypes: 'CUSTOMER',
                  },
                  review: {
                    uuid: 'review-uuid-3',
                    rating: 0,
                    review: 'Ride was canceled before pickup.',
                    createdAt: '2025-03-05T06:40:00.000Z',
                    updatedAt: '2025-03-05T06:40:00.000Z',
                    reviewedBy: {
                      uuid: 'customer-uuid-3',
                      firstname: 'Zainab',
                      lastname: 'Yusuf',
                      middlename: 'Aisha',
                      picture: 'https://cdn.dailyhelp.ng/customers/zainab.png',
                      email: 'zainab@example.com',
                      phone: '+2348054321987',
                      userType: 'CUSTOMER',
                      userTypes: 'CUSTOMER',
                    },
                    reviewedFor: {
                      uuid: 'provider-uuid-3',
                      firstname: 'Tomiwa',
                      lastname: 'Adeyemi',
                      middlename: 'Kayode',
                      picture: 'https://cdn.dailyhelp.ng/providers/tomiwa.png',
                      email: 'tomiwa@example.com',
                      phone: '+2348034567890',
                      userType: 'PROVIDER',
                      userTypes: 'PROVIDER',
                    },
                  },
                  dispute: {
                    uuid: 'dispute-uuid-3',
                    status: 'CLOSED',
                    category: 'CANCELLATION',
                    description:
                      'Provider requested compensation after late cancellation.',
                    createdAt: '2025-03-05T06:45:00.000Z',
                    updatedAt: '2025-03-05T07:00:00.000Z',
                  },
                  payment: {
                    uuid: 'payment-uuid-3',
                    amount: 28000,
                    status: 'refunded',
                    type: 'JOB',
                    currency: 'NGN',
                    processedAt: '2025-03-05T06:50:00.000Z',
                  },
                },
                timelines: [
                  {
                    uuid: 'timeline-created-uuid-3',
                    event: 'Job Created',
                    createdAt: '2025-03-04T12:30:00.000Z',
                    updatedAt: '2025-03-04T12:30:00.000Z',
                    actor: {
                      uuid: 'customer-uuid-3',
                      firstname: 'Zainab',
                      lastname: 'Yusuf',
                      middlename: 'Aisha',
                      picture: 'https://cdn.dailyhelp.ng/customers/zainab.png',
                      email: 'zainab@example.com',
                      phone: '+2348054321987',
                      userType: 'CUSTOMER',
                      userTypes: 'CUSTOMER',
                    },
                  },
                  {
                    uuid: 'timeline-accepted-uuid-3',
                    event: 'Job Accepted',
                    createdAt: '2025-03-04T18:00:00.000Z',
                    updatedAt: '2025-03-04T18:00:00.000Z',
                    actor: {
                      uuid: 'provider-uuid-3',
                      firstname: 'Tomiwa',
                      lastname: 'Adeyemi',
                      middlename: 'Kayode',
                      picture: 'https://cdn.dailyhelp.ng/providers/tomiwa.png',
                      email: 'tomiwa@example.com',
                      phone: '+2348034567890',
                      userType: 'PROVIDER',
                      userTypes: 'PROVIDER',
                    },
                  },
                  {
                    uuid: 'timeline-canceled-uuid-3',
                    event: 'Job Canceled',
                    createdAt: '2025-03-05T06:30:00.000Z',
                    updatedAt: '2025-03-05T06:30:00.000Z',
                    actor: {
                      uuid: 'customer-uuid-3',
                      firstname: 'Zainab',
                      lastname: 'Yusuf',
                      middlename: 'Aisha',
                      picture: 'https://cdn.dailyhelp.ng/customers/zainab.png',
                      email: 'zainab@example.com',
                      phone: '+2348054321987',
                      userType: 'CUSTOMER',
                      userTypes: 'CUSTOMER',
                    },
                  },
                ],
              },
            },
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
