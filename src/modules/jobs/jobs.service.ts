import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ForbiddenException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Job, JobTimeline } from './jobs.entity';
import { PaginationInput } from 'src/base/dto';
import { IAuthContext, JobStatus, TransactionType } from 'src/types';
import {
  CancelJobDto,
  DisputeJobDto,
  JobFilter,
  RateServiceProviderDto,
} from './jobs.dto';
import { Transaction, Wallet } from '../wallet/wallet.entity';
import { v4 } from 'uuid';
import { Users } from '../users/users.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { JobDispute } from './job-dispute.entity';
import { Conversation } from '../conversations/conversations.entity';

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
  ) {}

  async fetchRequestorJobs(
    pagination: PaginationInput,
    filter: JobFilter,
    { uuid }: IAuthContext,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const job = await this.jobRepository.find(
      {
        serviceRequestor: { uuid },
        ...(filter?.status ? { status: filter?.status } : {}),
      },
      { limit, offset: (page - 1) * limit },
    );
    return { status: true, data: job };
  }

  async verifyPin(jobUuid: string, pin: string) {
    const job = await this.jobRepository.findOne({ uuid: jobUuid });
    if (!job) throw new NotFoundException(`Job not found`);
    if (job.code !== pin) throw new UnauthorizedException(`Pin is not valid`);
    return { status: true };
  }

  async fetchJobTimelines(jobUuid: string) {
    const timelines = await this.jobTimelineRepository.find({
      job: { uuid: jobUuid },
    });
    return { status: true, data: timelines };
  }

  async startJob(jobUuid: string, { uuid }: IAuthContext) {
    const job = await this.jobRepository.findOne({
      uuid: jobUuid,
      serviceRequestor: { uuid },
    });
    if (!job) throw new NotFoundException(`Job not found`);
    if (job.status !== JobStatus.PENDING)
      throw new ForbiddenException(`This job is not startable`);
    job.status = JobStatus.IN_PROGRESS;
    const jobTimelineModel = this.jobTimelineRepository.create({
      uuid: v4(),
      job: this.jobRepository.getReference(jobUuid),
      event: 'Job Started',
      actor: this.usersRepository.getReference(uuid),
    });
    this.em.persist(jobTimelineModel);
    await this.em.flush();
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
      userType,
    });
    providerWallet.totalBalance += job.price;
    const transactionModel = this.transactionRepository.create({
      uuid: v4(),
      type: TransactionType.CREDIT,
      amount: job.price,
      wallet: this.walletRepository.getReference(providerWallet.uuid),
      job: this.jobRepository.getReference(jobUuid),
      remark: 'Job Payment',
      locked: true,
      lockedAt: new Date(),
    });
    this.em.persist(transactionModel);
    this.em.persist(jobTimelineModel);
    await this.em.flush();
    return { status: true };
  }

  async cancelJob(
    jobUuid: string,
    dto: CancelJobDto,
    { uuid, userType }: IAuthContext,
  ) {
    const job = await this.jobRepository.findOne({
      uuid: jobUuid,
      serviceRequestor: { uuid },
    });
    if (!job) throw new NotFoundException(`Job not found`);
    if (job.status !== JobStatus.PENDING)
      throw new ForbiddenException(`This job is not cancellable`);
    const conversation = await this.conversationRepository.findOne({
      serviceRequestor: { uuid },
      serviceProvider: { uuid: job.serviceProvider?.uuid },
    });
    if (!conversation) throw new NotFoundException(`Conversation not found`);
    conversation.restricted = true;
    job.status = JobStatus.CANCELED;
    job.cancellationReason = dto.reason;
    job.cancellationCategory = dto.reasonCategory;
    job.cancelledAt = new Date();
    const requestorWallet = await this.walletRepository.findOne({
      user: { uuid: job.serviceRequestor?.uuid },
      userType,
    });
    requestorWallet.totalBalance += job.price;
    const requestorTransactionModel = this.transactionRepository.create({
      uuid: v4(),
      type: TransactionType.CREDIT,
      amount: job.price,
      wallet: this.walletRepository.getReference(requestorWallet.uuid),
      job: this.jobRepository.getReference(jobUuid),
      remark: 'Job Refund for Cancellation',
      locked: true,
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
    return { status: true };
  }

  async rateServiceProvider(
    jobUuid: string,
    dto: RateServiceProviderDto,
    { uuid, userType }: IAuthContext,
  ) {
    const job = await this.jobRepository.findOne({
      uuid: jobUuid,
      serviceRequestor: { uuid },
    });
    if (!job) throw new NotFoundException(`Job not found`);
    if (job.status !== JobStatus.COMPLETED)
      throw new ForbiddenException(`This job is not reviewable`);
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
    if (dto.tip) {
      const [providerWallet, requestorWallet] = await Promise.all([
        this.walletRepository.findOne({
          user: { uuid: job.serviceProvider?.uuid },
          userType,
        }),
        this.walletRepository.findOne({
          user: { uuid },
          userType,
        }),
      ]);
      if (requestorWallet.availableBalance < dto.tip)
        throw new NotAcceptableException(`Insufficient balance`);
      providerWallet.availableBalance += dto.tip;
      providerWallet.totalBalance += dto.tip;
      requestorWallet.availableBalance -= dto.tip;
      requestorWallet.totalBalance -= dto.tip;
      const providerTransactionModel = this.transactionRepository.create({
        uuid: v4(),
        type: TransactionType.CREDIT,
        amount: job.price,
        wallet: this.walletRepository.getReference(providerWallet.uuid),
        job: this.jobRepository.getReference(jobUuid),
        remark: 'Job Tip',
        locked: false,
      });
      const requestorTransactionModel = this.transactionRepository.create({
        uuid: v4(),
        type: TransactionType.DEBIT,
        amount: job.price,
        wallet: this.walletRepository.getReference(requestorWallet.uuid),
        job: this.jobRepository.getReference(jobUuid),
        remark: 'Job Tip',
        locked: false,
      });
      this.em.persist(providerTransactionModel);
      this.em.persist(requestorTransactionModel);
    }
    await this.em.flush();
    const providerProgress = await this.em.getConnection().execute(`
      SELECT
        u.uuid,
        u.tier AS currentTier,
        COUNT(j.uuid) AS ratedCompletedJobs,
        ROUND(AVG(r.rating), 2) AS avgRating,

        CASE
          WHEN COUNT(j.uuid) >= 200 AND AVG(r.rating) >= 4 THEN 'PLATINUM'
          WHEN COUNT(j.uuid) >= 50 AND AVG(r.rating) >= 4 THEN 'GOLD'
          WHEN COUNT(j.uuid) >= 15 AND AVG(r.rating) >= 4 THEN 'SILVER'
          ELSE 'BRONZE'
        END AS eligibleTier,

        CASE 
          WHEN u.tier = 'BRONZE' AND AVG(r.rating) >= 4 THEN
            CONCAT(LEAST(ROUND(100 * COUNT(j.uuid) / 15, 0), 100), '%')
          WHEN u.tier = 'SILVER' AND AVG(r.rating) >= 4 THEN
            CONCAT(LEAST(ROUND(100 * (COUNT(j.uuid) - 15) / (50 - 15), 0), 100), '%')
          WHEN u.tier = 'GOLD' AND AVG(r.rating) >= 4 THEN
            CONCAT(LEAST(ROUND(100 * (COUNT(j.uuid) - 50) / (200 - 50), 0), 100), '%')
          ELSE '0%'
        END AS progressToNextTier,

        CASE 
          WHEN u.tier = 'BRONZE' THEN 'SILVER'
          WHEN u.tier = 'SILVER' THEN 'GOLD'
          WHEN u.tier = 'GOLD' THEN 'PLATINUM'
          ELSE NULL
        END AS nextTier

      FROM users u
      LEFT JOIN jobs j ON j.service_provider = u.uuid AND j.status = 'completed'
      LEFT JOIN job_reviews r ON r.job = j.uuid AND r.reviewed_for = u.uuid
      WHERE u.uuid = '${job.serviceProvider?.uuid}'
      GROUP BY u.uuid, u.tier;
    `);
    provider.tier = providerProgress[0].eligibleTier;
    provider.ratedCompletedJobs = providerProgress[0].ratedCompletedJobs;
    provider.avgRating = providerProgress[0].avgRating;
    provider.progressToNextTier = providerProgress[0].progressToNextTier;
    provider.nextTier = providerProgress[0].nextTier;
    this.em.flush();
    return { status: true };
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
    provider.completedJobs += provider.completedJobs;
    conversation.restricted = true;
    job.status = JobStatus.DISPUTED;
    const disputeModel = this.jobDisputeRepository.create({
      uuid: v4(),
      job: this.jobRepository.getReference(jobUuid),
      category: dto.reasonCategory,
      description: dto.description,
      pictures: dto.pictures.join(','),
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
}
