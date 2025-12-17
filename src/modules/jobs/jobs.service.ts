import {
  EntityManager,
  EntityRepository,
  FilterQuery,
  QueryOrder,
  wrap,
} from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Job, JobTimeline } from './jobs.entity';
import { PaginationInput } from 'src/base/dto';
import {
  IAuthContext,
  JobStatus,
  TransactionStatus,
  TransactionType,
  UserType,
} from 'src/types';
import {
  CancelJobDto,
  DisputeJobDto,
  JobFilter,
  RateServiceProviderDto,
  ReportClientDto,
} from './jobs.dto';
import { Transaction, Wallet } from '../wallet/wallet.entity';
import { v4 } from 'uuid';
import { Users } from '../users/users.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { JobDispute } from './job-dispute.entity';
import { Conversation } from '../conversations/conversations.entity';
import { JobReport } from './job-reports.entity';
import { AccountTierSetting } from '../admin/admin.entities';
import { SocketGateway } from '../ws/socket.gateway';
import { buildResponseDataWithPagination, generateOtp } from 'src/utils';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import { AgoraConfiguration } from 'src/config/configuration';

@Injectable()
export class JobService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Job)
    private readonly jobRepository: EntityRepository<Job>,
    @InjectRepository(JobTimeline)
    private readonly jobTimelineRepository: EntityRepository<JobTimeline>,
    @InjectRepository(Wallet)
    private readonly walletRepository: EntityRepository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: EntityRepository<Transaction>,
    @InjectRepository(Users)
    private readonly usersRepository: EntityRepository<Users>,
    @InjectRepository(JobReview)
    private readonly jobReviewRepository: EntityRepository<JobReview>,
    @InjectRepository(JobDispute)
    private readonly jobDisputeRepository: EntityRepository<JobDispute>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: EntityRepository<Conversation>,
    @InjectRepository(JobReport)
    private readonly jobReportRepository: EntityRepository<JobReport>,
    @InjectRepository(AccountTierSetting)
    private readonly accountTierRepository: EntityRepository<AccountTierSetting>,
    @Inject(forwardRef(() => SocketGateway))
    private readonly ws: SocketGateway,
    @Inject(AgoraConfiguration.KEY)
    private readonly agoraConfig: ConfigType<typeof AgoraConfiguration>,
  ) {}

  private readonly logger = new Logger(JobService.name);

  async fetchJobs(
    pagination: PaginationInput,
    filter: JobFilter,
    { uuid, userType }: IAuthContext,
  ) {
    const normalizedUserType = this.normalizeUserType(userType);
    if (!normalizedUserType)
      throw new ForbiddenException('Invalid user type');

    const { page: pageRaw = 1, limit: limitRaw = 20 } = pagination || {};
    const page = Math.max(1, Number(pageRaw) || 1);
    const limit = Math.max(1, Number(limitRaw) || 20);
    const offset = (page - 1) * limit;

    const statusQuery =
      filter?.status === JobStatus.COMPLETED
        ? { status: { $in: [JobStatus.COMPLETED, JobStatus.CANCELED] } }
        : filter?.status
        ? { status: filter.status }
        : {};

    const where: FilterQuery<Job> = {
      ...(normalizedUserType === UserType.CUSTOMER
        ? { serviceRequestor: { uuid } }
        : {}),
      ...(normalizedUserType === UserType.PROVIDER
        ? { serviceProvider: { uuid } }
        : {}),
      ...statusQuery,
    };

    const [jobs, total] = await Promise.all([
      this.jobRepository.find(where, {
        limit,
        offset,
        orderBy: {
          endDate: QueryOrder.DESC,
          startDate: QueryOrder.DESC,
          createdAt: QueryOrder.DESC,
        },
      }),
      this.jobRepository.count(where),
    ]);

    const providerIds = Array.from(
      new Set(
        jobs
          .map((job) => job.serviceProvider?.uuid)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const providers = providerIds.length
      ? await this.usersRepository.find(
          { uuid: { $in: providerIds } },
          {
            fields: [
              'uuid',
              'firstname',
              'lastname',
              'picture',
              'tier',
              'primaryJobRole',
              'primaryJobRole.uuid',
              'primaryJobRole.name',
            ],
            populate: ['primaryJobRole'],
          },
        )
      : [];

    const providerMap = new Map(
      providers.map((provider) => [
        provider.uuid,
        {
          picture: provider.picture ?? null,
          tier: provider.tier ?? null,
          firstname: provider.firstname ?? null,
          lastname: provider.lastname ?? null,
          primaryJobRole: provider.primaryJobRole?.name ?? null,
        },
      ]),
    );

    const shapedJobs = jobs.map((job) => {
      const providerUuid = job.serviceProvider?.uuid;
      const providerInfo = providerUuid
        ? providerMap.get(providerUuid)
        : undefined;

      return {
        ...wrap(job).toObject(),
        providerPicture: providerInfo?.picture ?? null,
        providerTier: providerInfo?.tier ?? null,
        providerFirstname: providerInfo?.firstname ?? null,
        providerLastname: providerInfo?.lastname ?? null,
        providerPrimaryJobRole: providerInfo?.primaryJobRole ?? null,
      };
    });

    return buildResponseDataWithPagination(shapedJobs, total, { page, limit });
  }

  async fetchAlternateProvidersForJob(jobUuid: string, requester: IAuthContext) {
    const normalizedUserType = this.normalizeUserType(requester.userType);
    if (normalizedUserType !== UserType.CUSTOMER)
      throw new ForbiddenException('Only customers can fetch alternate providers');

    const job = await this.jobRepository.findOne(
      { uuid: jobUuid, serviceRequestor: { uuid: requester.uuid } },
      { populate: ['serviceProvider', 'serviceProvider.primaryJobRole'] },
    );
    if (!job) throw new NotFoundException('Job not found');

    const primaryRoleUuid = job.serviceProvider?.primaryJobRole?.uuid;
    if (!primaryRoleUuid)
      throw new NotFoundException('Job provider primary role not found');

    const providers = await this.em
      .getConnection()
      .execute(
        `
          SELECT 
            u.uuid,
            u.firstname,
            u.lastname,
            u.avg_rating AS avgRating,
            u.service_description AS serviceDescription,
            r.name AS primaryJobRole,
            u.offer_starting_price AS offerStartingPrice,
            u.availability,
            u.engaged,
            COUNT(j.uuid) AS completedJobs,
            u.tier,
            u.picture,
            u.service_images AS serviceImages
          FROM users u
          LEFT JOIN jobs j 
            ON j.service_provider = u.uuid 
           AND j.status = 'completed'
          LEFT JOIN sub_categories r 
            ON u.primary_job_role = r.uuid
          WHERE u.availability = TRUE
            AND COALESCE(u.engaged, 0) = 0
            AND u.primary_job_role = ?
            AND u.uuid <> ?
            AND u.uuid <> ?
          GROUP BY u.uuid
          ORDER BY (
            (COALESCE(u.avg_rating, 0) * 2) +
            (CASE u.tier 
              WHEN 'PLATINUM' THEN 7
              WHEN 'GOLD' THEN 5
              WHEN 'SILVER' THEN 3
              WHEN 'BRONZE' THEN 1
              ELSE 0
            END) +
            (CASE COALESCE(u.engaged, 0) WHEN 0 THEN 2 ELSE -2 END) +
            (DATEDIFF(CURDATE(), u.last_logged_in) * -0.3)
          ) DESC,
          u.last_logged_in DESC
          LIMIT 10
        `,
        [primaryRoleUuid, job.serviceProvider?.uuid ?? '', requester.uuid],
      );

    return { status: true, data: providers };
  }

  async verifyPin(jobUuid: string, pin: string) {
    const job = await this.jobRepository.findOne({ uuid: jobUuid });
    if (!job) throw new NotFoundException(`Job not found`);
    if (job.code !== pin) throw new BadRequestException(`Pin is not valid`);
    return { status: true };
  }

  async updateProviderIdentityVerification(
    jobUuid: string,
    verified: boolean,
    requester: IAuthContext,
  ) {
    const job = await this.jobRepository.findOne(
      { uuid: jobUuid },
      { populate: ['serviceProvider', 'serviceRequestor'] },
    );
    if (!job) throw new NotFoundException('Job not found');

    const isParticipant =
      job.serviceProvider?.uuid === requester.uuid ||
      job.serviceRequestor?.uuid === requester.uuid;
    if (!isParticipant)
      throw new ForbiddenException('You are not part of this job');

    job.providerIdentityVerified = verified;
    await this.em.flush();

    return {
      status: true,
      data: { providerIdentityVerified: job.providerIdentityVerified },
    };
  }

  async shareJobCode(jobUuid: string, { uuid }: IAuthContext) {
    const job = await this.jobRepository.findOne(
      { uuid: jobUuid, serviceRequestor: { uuid } },
      { populate: ['serviceProvider', 'serviceRequestor'] },
    );
    if (!job) throw new NotFoundException('Job not found');
    const providerUuid = job.serviceProvider?.uuid;
    if (!providerUuid) throw new NotFoundException('Provider not found');
    if (!job.code) throw new NotAcceptableException('Job code is not available');

    this.ws.jobCodeShared({
      uuid: job.uuid,
      serviceProviderUuid: providerUuid,
      serviceRequestorUuid: job.serviceRequestor?.uuid,
      code: job.code,
    });

    return { status: true };
  }

  async fetchJobTimelines(jobUuid: string, requester: IAuthContext) {
    const normalizedUserType = this.normalizeUserType(requester.userType);
    if (!normalizedUserType)
      throw new ForbiddenException('Invalid user type');

    const job = await this.jobRepository.findOne({
      uuid: jobUuid,
      ...(normalizedUserType === UserType.CUSTOMER
        ? { serviceRequestor: { uuid: requester.uuid } }
        : {}),
      ...(normalizedUserType === UserType.PROVIDER
        ? { serviceProvider: { uuid: requester.uuid } }
        : {}),
    });
    if (!job) throw new NotFoundException('Job not found');

    const timelines = await this.jobTimelineRepository.find(
      { job: { uuid: jobUuid } },
      { orderBy: { createdAt: QueryOrder.ASC }, populate: ['actor'] },
    );
    return {
      status: true,
      data: timelines.map((timeline) => this.buildJobTimelineResponse(timeline)),
    };
  }

  async startJob(jobUuid: string, { uuid }: IAuthContext) {
    const job = await this.jobRepository.findOne({
      uuid: jobUuid,
      serviceRequestor: { uuid },
    });
    if (!job) throw new NotFoundException(`Job not found`);
    if (job.status !== JobStatus.PENDING)
      throw new ForbiddenException(`This job is not startable`);
    if (!job.providerIdentityVerified)
      throw new ForbiddenException('Provider identity is not verified');
    const provider = await this.usersRepository.findOne({
      uuid: job.serviceProvider?.uuid,
    });
    if (!provider) throw new NotFoundException(`Provider not found`);
    if (provider.engaged)
      throw new ConflictException(`Provider is currently engaged`);
    provider.engaged = true;
    job.status = JobStatus.IN_PROGRESS;
    const jobTimelineModel = this.jobTimelineRepository.create({
      uuid: v4(),
      job: this.jobRepository.getReference(jobUuid),
      event: 'Job Started',
      actor: this.usersRepository.getReference(uuid),
    });
    this.em.persist(jobTimelineModel);
    await this.em.flush();
    this.ws.jobUpdated({
      uuid: job.uuid,
      serviceProviderUuid: job.serviceProvider?.uuid,
      serviceRequestorUuid: job.serviceRequestor?.uuid,
      status: job.status,
      ...job,
    });
    return { status: true };
  }

  async endJob(jobUuid: string, { uuid, userType }: IAuthContext) {
    const job = await this.jobRepository.findOne({
      uuid: jobUuid,
      serviceRequestor: { uuid },
    });
    if (!job) throw new NotFoundException(`Job not found`);
    if (job.status !== JobStatus.IN_PROGRESS)
      throw new ForbiddenException(`This job is not endable`);
    const [conversation, provider] = await Promise.all([
      this.conversationRepository.findOne({
        serviceRequestor: { uuid },
        serviceProvider: { uuid: job.serviceProvider?.uuid },
      }),
      this.usersRepository.findOne({ uuid: job.serviceProvider?.uuid }),
    ]);
    if (!conversation) throw new NotFoundException(`Conversation not found`);
    if (!provider) throw new NotFoundException(`Provider not found`);
    provider.completedJobs += provider.completedJobs;
    provider.engaged = false;
    conversation.restricted = true;
    job.status = JobStatus.COMPLETED;
    const jobTimelineModel = this.jobTimelineRepository.create({
      uuid: v4(),
      job: this.jobRepository.getReference(jobUuid),
      event: 'Job Ended',
      actor: this.usersRepository.getReference(uuid),
    });
    const providerWallet = await this.walletRepository.findOne({
      user: { uuid: job.serviceProvider?.uuid },
      userType: UserType.PROVIDER,
    });
    if (!providerWallet)
      throw new NotFoundException('Provider wallet not found');
    providerWallet.totalBalance += job.price * 0.1;
    const transactionModel = this.transactionRepository.create({
      uuid: v4(),
      type: TransactionType.CREDIT,
      amount: job.price * 0.1,
      wallet: this.walletRepository.getReference(providerWallet.uuid),
      job: this.jobRepository.getReference(jobUuid),
      remark: 'Job Payment',
      locked: true,
      status: TransactionStatus.PENDING,
      lockedAt: new Date(),
    });
    this.em.persist(transactionModel);
    this.em.persist(jobTimelineModel);
    await this.em.flush();
    this.ws.jobUpdated({
      uuid: job.uuid,
      serviceProviderUuid: job.serviceProvider?.uuid,
      serviceRequestorUuid: job.serviceRequestor?.uuid,
      status: job.status,
      ...job,
    });
    return { status: true };
  }

  async cancelJob(
    jobUuid: string,
    dto: CancelJobDto,
    { uuid, userType }: IAuthContext,
  ) {
    const job = await this.jobRepository.findOne({
      uuid: jobUuid,
      ...(userType === UserType.CUSTOMER
        ? { serviceRequestor: { uuid } }
        : { serviceProvider: { uuid } }),
    });
    if (!job) throw new NotFoundException(`Job not found`);
    if (job.status !== JobStatus.PENDING)
      throw new ForbiddenException(`This job is not cancellable`);
    const conversation = await this.conversationRepository.findOne({
      serviceRequestor: { uuid: job.serviceRequestor?.uuid },
      serviceProvider: { uuid: job.serviceProvider?.uuid },
    });
    if (!conversation) throw new NotFoundException(`Conversation not found`);
    conversation.restricted = true;
    job.status = JobStatus.CANCELED;
    job.cancellationReason = dto.reason ?? null;
    job.cancellationCategory = dto.reasonCategory ?? null;
    job.cancelledAt = new Date();
    const requestorWallet = await this.walletRepository.findOne({
      user: { uuid: job.serviceRequestor?.uuid },
      userType: UserType.CUSTOMER,
    });
    if (!requestorWallet)
      throw new NotFoundException('Customer wallet not found');
    requestorWallet.totalBalance += job.price;
    const requestorTransactionModel = this.transactionRepository.create({
      uuid: v4(),
      type: TransactionType.CREDIT,
      amount: job.price,
      wallet: this.walletRepository.getReference(requestorWallet.uuid),
      job: this.jobRepository.getReference(jobUuid),
      remark: 'Job Refund for Cancellation',
      locked: true,
      status: TransactionStatus.PENDING,
    });
    const jobTimelineModel = this.jobTimelineRepository.create({
      uuid: v4(),
      job: this.jobRepository.getReference(jobUuid),
      event: 'Job Canceled',
      actor: this.usersRepository.getReference(uuid),
    });
    this.em.persist(jobTimelineModel);
    this.em.persist(requestorTransactionModel);
    await this.em.flush();
    this.ws.jobUpdated({
      uuid: job.uuid,
      serviceProviderUuid: job.serviceProvider?.uuid,
      serviceRequestorUuid: job.serviceRequestor?.uuid,
      status: job.status,
      ...job,
    });
    return { status: true };
  }

  async rateServiceProvider(
    jobUuid: string,
    dto: RateServiceProviderDto,
    { uuid, userType }: IAuthContext,
  ) {
    if (dto.rating < 1 || dto.rating > 5)
      throw new NotAcceptableException('Rating must be between 1 and 5');

    const job = await this.jobRepository.findOne({
      uuid: jobUuid,
      serviceRequestor: { uuid },
    });
    if (!job) throw new NotFoundException(`Job not found`);
    if (job.status !== JobStatus.COMPLETED)
      throw new ForbiddenException(`This job is not reviewable`);

    const existingReview =
      job.review ??
      (await this.jobReviewRepository.findOne({
        job: { uuid: jobUuid },
      }));
    if (existingReview)
      throw new NotAcceptableException('Job has already been reviewed');

    const provider = await this.usersRepository.findOne({
      uuid: job.serviceProvider?.uuid,
    });
    if (!provider) throw new NotFoundException('Provider not found');
    const reviewUuid = v4();
    const jobReviewModel = this.jobReviewRepository.create({
      uuid: reviewUuid,
      job: this.jobRepository.getReference(jobUuid),
      rating: dto.rating,
      review: dto.review,
      reviewedBy: this.usersRepository.getReference(uuid),
      reviewedFor: this.usersRepository.getReference(job.serviceProvider?.uuid),
    });
    job.review = this.jobReviewRepository.getReference(reviewUuid);
    this.em.persist(jobReviewModel);
    if (dto.tip !== undefined && dto.tip !== null) {
      const tipAmount = Number(dto.tip);
      if (tipAmount <= 0)
        throw new NotAcceptableException('Tip must be greater than zero');
      const [providerWallet, requestorWallet] = await Promise.all([
        this.walletRepository.findOne({
          user: { uuid: job.serviceProvider?.uuid },
          userType: UserType.PROVIDER,
        }),
        this.walletRepository.findOne({
          user: { uuid },
          userType: UserType.CUSTOMER,
        }),
      ]);
      if (!providerWallet)
        throw new NotFoundException('Provider wallet not found');
      if (!requestorWallet)
        throw new NotFoundException('Customer wallet not found');
      if (requestorWallet.availableBalance < tipAmount)
        throw new NotAcceptableException(`Insufficient balance`);
      providerWallet.availableBalance += tipAmount;
      providerWallet.totalBalance += tipAmount;
      requestorWallet.availableBalance -= tipAmount;
      requestorWallet.totalBalance -= tipAmount;
      job.tip = tipAmount;
      const providerTransactionModel = this.transactionRepository.create({
        uuid: v4(),
        type: TransactionType.CREDIT,
        amount: tipAmount,
        wallet: this.walletRepository.getReference(providerWallet.uuid),
        job: this.jobRepository.getReference(jobUuid),
        remark: 'Job Tip',
        locked: false,
      });
      const requestorTransactionModel = this.transactionRepository.create({
        uuid: v4(),
        type: TransactionType.DEBIT,
        amount: tipAmount,
        wallet: this.walletRepository.getReference(requestorWallet.uuid),
        job: this.jobRepository.getReference(jobUuid),
        remark: 'Job Tip',
        locked: false,
      });
      this.em.persist(providerTransactionModel);
      this.em.persist(requestorTransactionModel);
    }
    await this.em.flush();
    if (provider?.uuid) {
      await this.recalculateProviderTier(provider.uuid);
    }
    return { status: true };
  }

  async fetchJobDetail(jobUuid: string, { uuid, userType }: IAuthContext) {
    const normalizedUserType = this.normalizeUserType(userType);
    if (!normalizedUserType)
      throw new ForbiddenException('Invalid user type');

    const where: FilterQuery<Job> = {
      uuid: jobUuid,
      ...(normalizedUserType === UserType.CUSTOMER
        ? { serviceRequestor: { uuid } }
        : {}),
      ...(normalizedUserType === UserType.PROVIDER
        ? { serviceProvider: { uuid } }
        : {}),
    };

    const job = await this.jobRepository.findOne(where, {
      populate: [
        'serviceProvider',
        'serviceRequestor',
        'review',
        'review.reviewedBy',
        'review.reviewedFor',
        'dispute',
        'payment',
      ],
    });

    if (!job) throw new NotFoundException('Job not found');

    const review =
      job.review ??
      (await this.jobReviewRepository.findOne(
        { job: { uuid: jobUuid } },
        {
          populate: ['reviewedBy', 'reviewedFor'],
          orderBy: { createdAt: QueryOrder.DESC },
        },
      ));

    const timelines = await this.jobTimelineRepository.find(
      { job: { uuid: jobUuid } },
      { orderBy: { createdAt: QueryOrder.ASC }, populate: ['actor'] },
    );

    const response = {
      job: {
        uuid: job.uuid,
        status: job.status,
        requestId: job.requestId,
        price: job.price,
        startDate: job.startDate,
        endDate: job.endDate,
        description: job.description,
        pictures: job.pictures,
        tip: job.tip,
        code: job.code,
        providerIdentityVerified: job.providerIdentityVerified,
        acceptedAt: job.acceptedAt,
        cancelledAt: job.cancelledAt,
        cancellationReason: job.cancellationReason,
        cancellationCategory: job.cancellationCategory,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        serviceProvider: this.buildUserSummary(job.serviceProvider),
        serviceRequestor: this.buildUserSummary(job.serviceRequestor),
        review: review
          ? {
              uuid: review.uuid,
              rating: review.rating,
              review: review.review,
              createdAt: review.createdAt,
              updatedAt: review.updatedAt,
              reviewedBy: this.buildUserSummary(review.reviewedBy),
              reviewedFor: this.buildUserSummary(review.reviewedFor),
            }
          : null,
        dispute: job.dispute
          ? {
              uuid: job.dispute.uuid,
              status: job.dispute.status,
              category: job.dispute.category,
              description: job.dispute.description,
              createdAt: job.dispute.createdAt,
              updatedAt: job.dispute.updatedAt,
            }
          : null,
        payment: job.payment
          ? {
              uuid: job.payment.uuid,
              amount: job.payment.amount,
              status: job.payment.status,
              type: job.payment.type,
              currency: job.payment.currency,
              processedAt: job.payment.processedAt,
            }
          : null,
      },
      timelines: timelines.map((timeline) =>
        this.buildJobTimelineResponse(timeline),
      ),
    };

    return { status: true, data: response };
  }

  async generateCallToken(conversationUuid: string, requester: IAuthContext) {
    const conversation = await this.conversationRepository.findOne(
      { uuid: conversationUuid },
      { populate: ['serviceProvider', 'serviceRequestor'] },
    );
    if (!conversation) throw new NotFoundException('Conversation not found');

    const providerUuid = conversation.serviceProvider?.uuid;
    const requestorUuid = conversation.serviceRequestor?.uuid;
    if (!providerUuid || !requestorUuid)
      throw new NotFoundException('Conversation participants not found');

    const isParticipant =
      providerUuid === requester.uuid || requestorUuid === requester.uuid;
    if (!isParticipant)
      throw new ForbiddenException('You are not part of this conversation');

    const job = await this.jobRepository.findOne(
      {
        serviceProvider: { uuid: providerUuid },
        serviceRequestor: { uuid: requestorUuid },
        status: { $in: [JobStatus.PENDING, JobStatus.IN_PROGRESS] },
      },
      { populate: ['payment'], orderBy: { createdAt: QueryOrder.DESC } },
    );

    if (!job)
      throw new NotFoundException(
        'No active job found for this conversation',
      );

    const paymentStatus = (job.payment?.status || '').toLowerCase();
    if (!job.payment || paymentStatus !== 'success')
      throw new ForbiddenException('Job payment has not been completed');

    if (!this.agoraConfig?.appId || !this.agoraConfig?.appCertificate) {
      throw new InternalServerErrorException('Agora is not configured');
    }

    const buildDisplayName = (
      user?: {
        firstname?: string | null;
        lastname?: string | null;
        email?: string | null;
        phone?: string | null;
        uuid?: string;
      } | null,
      fallback?: string,
    ) => {
      if (!user) return fallback || null;
      const full = [user.firstname, user.lastname]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (full) return full;
      if (user.email) return user.email;
      if (user.phone) return user.phone;
      return fallback || user.uuid || null;
    };

    const ttlSeconds = Math.max(
      60,
      Number(this.agoraConfig.tokenTtlSeconds || 3600),
    );
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + ttlSeconds;
    const channelName = `job-${job.uuid}`;
    const agoraUid = 0;
    const recipientUuid =
      requester.uuid === providerUuid ? requestorUuid : providerUuid;
    const callerUser =
      requester.uuid === providerUuid
        ? conversation.serviceProvider
        : conversation.serviceRequestor;
    const callerName =
      buildDisplayName(requester, buildDisplayName(callerUser, requester.uuid)) ||
      'Someone';

    let token: string;
    try {
      token = this.buildAgoraRtcToken(channelName, agoraUid, ttlSeconds);
    } catch (error) {
      this.logger.error(
        `Failed to generate Agora token for channel=${channelName}, uid=${agoraUid}, requester=${requester.uuid}: ${error?.message || error}`,
      );
      throw new InternalServerErrorException('Failed to generate Agora token');
    }

    this.logger.debug(
      `Generated Agora token payload → channel=${channelName}, uid=${agoraUid}, requester=${requester.uuid}, role=${RtcRole.PUBLISHER}, exp=${expiresAtSeconds}`,
    );

    const expiresAtIso = new Date(expiresAtSeconds * 1000).toISOString();
    this.ws.callInitiated({
      conversationUuid,
      jobUuid: job.uuid,
      fromUuid: requester.uuid,
      toUuid: recipientUuid,
      appId: this.agoraConfig.appId,
      channel: channelName,
      token,
      uid: agoraUid,
      expiresAt: expiresAtIso,
      ttlSeconds,
      fromName: callerName,
    });

    const response = {
      status: true,
      data: {
        appId: this.agoraConfig.appId,
        channel: channelName,
        token,
        uid: agoraUid,
        expiresAt: expiresAtIso,
        ttlSeconds,
      },
    };

    this.logger.debug(
      `Call token response for conversation=${conversationUuid}: ${JSON.stringify(
        response,
      )}`,
    );

    return response;
  }

  private buildAgoraRtcToken(
    channelName: string,
    uid: number,
    ttlSeconds: number,
  ) {
    try {
      this.logger.debug(
        `Agora token input → appId=${this.agoraConfig.appId}, channel=${channelName}, uid=${uid}, role=${RtcRole.PUBLISHER}, tokenTtlSeconds=${ttlSeconds}, privilegeTtlSeconds=${ttlSeconds}`,
      );
      return RtcTokenBuilder.buildTokenWithUid(
        this.agoraConfig.appId,
        this.agoraConfig.appCertificate,
        channelName,
        uid,
        RtcRole.PUBLISHER,
        ttlSeconds,
        ttlSeconds,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Agora token build failed: ${error?.message || error}`,
      );
    }
  }

  private buildUserSummary(user?: Users | null) {
    if (!user) return null;
    const userType = this.resolvePrimaryUserType(user.userTypes);
    return {
      uuid: user.uuid,
      firstname: user.firstname ?? null,
      lastname: user.lastname ?? null,
      middlename: user.middlename ?? null,
      picture: user.picture ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      userType,
      userTypes: user.userTypes ?? null,
    };
  }

  private buildJobTimelineResponse(timeline: JobTimeline) {
    return {
      uuid: timeline.uuid,
      event: timeline.event,
      createdAt: timeline.createdAt,
      updatedAt: timeline.updatedAt,
      actor: this.buildUserSummary(timeline.actor),
    };
  }

  private normalizeUserType(userType?: UserType | string | null): UserType | null {
    if (!userType) return null;
    const normalized = `${userType}`.trim().toUpperCase();
    if (normalized === UserType.CUSTOMER) return UserType.CUSTOMER;
    if (normalized === UserType.PROVIDER) return UserType.PROVIDER;
    return null;
  }

  private resolvePrimaryUserType(userTypes?: string | null) {
    if (!userTypes) return null;
    const primary = userTypes
      .split(',')
      .map((type) => type.trim())
      .filter((type) => type.length > 0)[0];
    return primary ? (primary.toUpperCase() as UserType) : null;
  }

  private computeTierProgress(
    completedJobs: number,
    avgRating: number,
    current: AccountTierSetting | null,
    next: AccountTierSetting,
  ) {
    const currentJobs = current?.minJobs ?? 0;
    const nextJobs = next.minJobs ?? 0;
    const jobWindow = Math.max(0, nextJobs - currentJobs);
    const jobsDelta = Math.max(0, completedJobs - currentJobs);
    const jobProgress = jobWindow
      ? Math.min(1, jobsDelta / jobWindow)
      : 1;

    const currentRating = current?.minAvgRating ?? 0;
    const nextRating = next.minAvgRating ?? 0;
    const ratingWindow = Math.max(0, nextRating - currentRating);
    const ratingDelta = Math.max(0, avgRating - currentRating);
    const ratingProgress = ratingWindow
      ? Math.min(1, ratingDelta / ratingWindow)
      : 1;

    const progress = Math.min(jobProgress, ratingProgress);
    return `${Math.min(100, Math.round(progress * 100))}%`;
  }

  private async recalculateProviderTier(providerUuid: string) {
    const tierSettings = await this.accountTierRepository.findAll({
      orderBy: { displayOrder: QueryOrder.ASC, minJobs: QueryOrder.ASC },
    });
    if (!tierSettings.length) return;

    const [stats] = await this.em.getConnection().execute(
      `
        SELECT
          COUNT(CASE WHEN j.status = 'completed' THEN j.uuid END) AS completedJobs,
          COUNT(r.uuid) AS ratedCompletedJobs,
          ROUND(AVG(r.rating), 2) AS avgRating
        FROM jobs j
        LEFT JOIN job_reviews r
          ON r.job = j.uuid
          AND r.reviewed_for = ?
        WHERE j.service_provider = ?
      `,
      [providerUuid, providerUuid],
    );

    const completedJobs = Number(stats?.completedJobs ?? 0);
    const ratedCompletedJobs = Number(stats?.ratedCompletedJobs ?? 0);
    const avgRating = Number(stats?.avgRating ?? 0) || 0;

    let resolvedIndex = 0;
    for (let index = 0; index < tierSettings.length; index += 1) {
      const setting = tierSettings[index];
      const meetsJobs = completedJobs >= (setting.minJobs ?? 0);
      const meetsRating = avgRating >= (setting.minAvgRating ?? 0);
      if (meetsJobs && meetsRating) {
        resolvedIndex = index;
      }
    }

    const resolvedSetting = tierSettings[resolvedIndex];
    const nextSetting = tierSettings[resolvedIndex + 1] ?? null;

    const provider = await this.usersRepository.findOne({ uuid: providerUuid });
    if (!provider) return;

    provider.tier = resolvedSetting.tier;
    provider.completedJobs = completedJobs;
    provider.ratedCompletedJobs = ratedCompletedJobs;
    provider.avgRating = avgRating;
    provider.nextTier = nextSetting ? nextSetting.tier : resolvedSetting.tier;
    provider.progressToNextTier = nextSetting
      ? this.computeTierProgress(
          completedJobs,
          avgRating,
          resolvedSetting,
          nextSetting,
        )
      : '100%';
    await this.em.flush();
  }

  async disputeJob(
    jobUuid: string,
    dto: DisputeJobDto,
    { uuid, userType }: IAuthContext,
  ) {
    const job = await this.jobRepository.findOne({
      uuid: jobUuid,
      serviceRequestor: { uuid },
    });
    if (!job) throw new NotFoundException(`Job not found`);
    if (job.status !== JobStatus.IN_PROGRESS)
      throw new ForbiddenException(`This job is not disputable`);
    const [conversation, provider] = await Promise.all([
      this.conversationRepository.findOne({
        serviceRequestor: { uuid },
        serviceProvider: { uuid: job.serviceProvider?.uuid },
      }),
      this.usersRepository.findOne({ uuid: job.serviceProvider?.uuid }),
    ]);
    if (!conversation) throw new NotFoundException(`Conversation not found`);
    if (!provider) throw new NotFoundException(`Provider not found`);
    provider.engaged = false;
    provider.completedJobs += provider.completedJobs;
    conversation.restricted = true;
    job.status = JobStatus.DISPUTED;
    const pictures =
      Array.isArray(dto.pictures) && dto.pictures.length
        ? dto.pictures.filter(Boolean)
        : [];
    const disputeModel = this.jobDisputeRepository.create({
      uuid: v4(),
      job: this.jobRepository.getReference(jobUuid),
      code: `DH${generateOtp(4)}`,
      category: dto.reasonCategory ?? null,
      description: dto.description ?? null,
      pictures: pictures.length ? pictures.join(',') : null,
      submittedBy: this.usersRepository.getReference(uuid),
      submittedFor: this.usersRepository.getReference(
        job.serviceProvider?.uuid,
      ),
      userType,
    });
    const jobTimelineModel = this.jobTimelineRepository.create({
      uuid: v4(),
      job: this.jobRepository.getReference(jobUuid),
      event: 'Job Disputed',
      actor: this.usersRepository.getReference(uuid),
    });
    this.em.persist(jobTimelineModel);
    this.em.persist(disputeModel);
    await this.em.flush();
    return { status: true };
  }

  async reportClient(
    jobUuid: string,
    dto: ReportClientDto,
    { uuid }: IAuthContext,
  ) {
    const job = await this.jobRepository.findOne({ uuid: jobUuid });
    if (!job) throw new NotFoundException(`Job not found`);
    const jobReport = this.jobReportRepository.create({
      uuid: v4(),
      job: this.jobRepository.getReference(jobUuid),
      category: dto.reportCategory,
      description: dto.description,
      pictures: dto.pictures.join(','),
      submittedBy: this.usersRepository.getReference(uuid),
    });
    this.em.persist(jobReport);
    await this.em.flush();
    return { status: true };
  }
}
