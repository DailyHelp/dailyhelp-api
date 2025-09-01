import {
  Connection,
  EntityManager,
  EntityRepository,
  FilterQuery,
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
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AccountDeletionRequest,
  BankAccount,
  Feedback,
  Users,
} from './users.entity';
import { SharedService } from '../shared/shared.service';
import {
  BankAccountDto,
  CancelOfferDto,
  ClientDashboardFilter,
  ConfirmDeletionRequestDto,
  CounterOfferDto,
  CreateDeletionRequestDto,
  DisputeFilter,
  FeedbackDto,
  PaymentInfo,
  ReportConversationDto,
  ResolveBankAccountDto,
  SaveLocationDto,
  SavePricesDto,
  SaveProviderDetails,
  SendMessageDto,
  SendOfferDto,
  UpdatePricesDto,
  VerifyIdentityDto,
  WithdrawFundsDto,
} from './users.dto';
import {
  AccountTier,
  Currencies,
  DisputeStatus,
  IAuthContext,
  JobStatus,
  MessageType,
  OfferStatus,
  OrderDir,
  PaymentPurpose,
  PaymentType,
  TransactionStatus,
  TransactionType,
  UserType,
} from 'src/types';
import axios, { AxiosResponse } from 'axios';
import {
  PaystackConfiguration,
  QoreIDConfiguration,
} from 'src/config/configuration';
import { ConfigType } from '@nestjs/config';
import { v4 } from 'uuid';
import { Location } from 'src/entities/location.entity';
import { PaginationInput } from 'src/base/dto';
import {
  appendCondition,
  buildResponseDataWithPagination,
  generateOtp,
} from 'src/utils';
import {
  Conversation,
  Offer,
  Report,
} from '../conversations/conversations.entity';
import { ConversationReadState, Message } from 'src/entities/message.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { differenceInHours, endOfDay, startOfDay } from 'date-fns';
import { Job, JobTimeline } from '../jobs/jobs.entity';
import { JwtService } from '@nestjs/jwt';
import { SubCategory } from '../admin/admin.entities';
import { Transaction, Wallet } from '../wallet/wallet.entity';
import { JobDispute } from '../jobs/job-dispute.entity';
import bcrypt from 'bcryptjs';
import { Payment } from '../../entities/payment.entity';
import { SocketGateway } from '../ws/socket.gateway';
import { ReadStateService } from '../ws/read-state.service';
import { PresenceService } from '../ws/presence.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Users)
    private readonly usersRepository: EntityRepository<Users>,
    @InjectRepository(Location)
    private readonly locationRepository: EntityRepository<Location>,
    @InjectRepository(JobReview)
    private readonly reviewRepository: EntityRepository<JobReview>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: EntityRepository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: EntityRepository<Message>,
    @InjectRepository(Offer)
    private readonly offerRepository: EntityRepository<Offer>,
    @InjectRepository(Payment)
    private readonly paymentRepository: EntityRepository<Payment>,
    @InjectRepository(Job)
    private readonly jobRepository: EntityRepository<Job>,
    @InjectRepository(JobTimeline)
    private readonly jobTimelineRepository: EntityRepository<JobTimeline>,
    @InjectRepository(Report)
    private readonly reportRepository: EntityRepository<Report>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: EntityRepository<SubCategory>,
    @InjectRepository(Wallet)
    private readonly walletRepository: EntityRepository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: EntityRepository<Transaction>,
    @InjectRepository(JobDispute)
    private readonly disputeRepository: EntityRepository<JobDispute>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: EntityRepository<Feedback>,
    @InjectRepository(AccountDeletionRequest)
    private readonly accountDeletionRepository: EntityRepository<AccountDeletionRequest>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: EntityRepository<BankAccount>,
    @InjectRepository(ConversationReadState)
    private readonly conversationReadRepository: EntityRepository<ConversationReadState>,
    private readonly sharedService: SharedService,
    @Inject(QoreIDConfiguration.KEY)
    private readonly qoreidConfig: ConfigType<typeof QoreIDConfiguration>,
    @Inject(PaystackConfiguration.KEY)
    private readonly paystackConfig: ConfigType<typeof PaystackConfiguration>,
    private readonly jwtService: JwtService,
    private readonly ws: SocketGateway,
    private readonly readService: ReadStateService,
    private readonly presence: PresenceService,
  ) {}

  async findByEmailOrPhone(emailOrPhone: string) {
    let username: string;
    try {
      username = this.sharedService
        .validatePhoneNumber(emailOrPhone)
        .substring(1);
    } catch (error) {
      username = emailOrPhone;
    } finally {
      const user = await this.usersRepository.findOne({
        $or: [{ email: username }, { phone: username }],
      });
      return { status: true, data: user };
    }
  }

  async verifyIdentity(identity: VerifyIdentityDto, { uuid }: IAuthContext) {
    const userExists = await this.usersRepository.findOne({ uuid });
    if (!userExists) throw new NotFoundException(`User does not exist`);
    let bvnResponse: AxiosResponse<any, any>;
    let ninResponse: AxiosResponse<any, any>;
    try {
      const token = await this.sharedService.getQoreIDToken();
      [bvnResponse, ninResponse] = await Promise.all([
        axios.post(
          `${this.qoreidConfig.baseUrl}/v1/ng/identities/face-verification/nin`,
          { idNumber: identity.nin, photoUrl: identity.photo },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
        axios.post(
          `${this.qoreidConfig.baseUrl}/v1/ng/identities/bvn-match/${identity.bvn}`,
          { firstname: identity.firstname, lastname: identity.lastname },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ]);
    } catch (error) {
      console.log('Identity verification failed', error);
      throw new InternalServerErrorException(error?.response?.data?.message);
    }
    userExists.firstname = identity.firstname;
    userExists.middlename = identity.middlename;
    userExists.lastname = identity.lastname;
    userExists.dob = identity.dob;
    userExists.gender = identity.gender;
    userExists.nin = identity.nin;
    userExists.bvn = identity.bvn;
    userExists.bvnData = JSON.stringify(bvnResponse?.data);
    userExists.ninData = JSON.stringify(ninResponse?.data);
    userExists.identityVerified = true;
    userExists.picture = identity.photo;
    await this.em.flush();
    return { status: true };
  }

  async saveLocation(dto: SaveLocationDto, { uuid, userType }: IAuthContext) {
    const userExists = await this.usersRepository.findOne({ uuid });
    if (!userExists) throw new NotFoundException(`User does not exist`);
    const locationExists = await this.locationRepository.findOne({
      address: dto.address,
      user: { uuid },
    });
    if (locationExists) throw new ConflictException(`Duplicate address`);
    const locationUuid = v4();
    const locationModel = this.locationRepository.create({
      uuid: locationUuid,
      address: dto.address,
      state: dto.state,
      lga: dto.lga,
      description: dto.description,
      lat: dto.lat,
      lng: dto.lng,
      user: this.usersRepository.getReference(uuid),
      userType,
    });
    if (userType === UserType.PROVIDER) {
      userExists.providerAddress =
        this.locationRepository.getReference(locationUuid);
      if (!dto.utilityBill)
        throw new BadRequestException(`Utility bill is required`);
      userExists.utilityBill = dto.utilityBill;
      userExists.providerOnboarding = {
        ...userExists.providerOnboarding,
        step1: true,
      };
    } else if (dto.default) {
      userExists.defaultLocation =
        this.locationRepository.getReference(locationUuid);
    }
    this.em.persist(locationModel);
    await this.em.flush();
    return { status: true };
  }

  async fetchLocations(
    defaultOnly: string,
    { uuid, userType }: IAuthContext,
    search?: string,
  ): Promise<any> {
    const where: any = { user: { uuid }, userType };

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;

      where.$or = [
        { address: { $like: q } },
        { state: { $like: q } },
        { lga: { $like: q } },
        { description: { $like: q } },
      ];

      const s = search.trim().toLowerCase();
      if (['verified', 'true', 'yes', '1', 'on'].includes(s))
        where.$or.push({ verified: true });
      if (['unverified', 'false', 'no', '0', 'off'].includes(s))
        where.$or.push({ verified: false });

      const num = Number(search);
      if (!Number.isNaN(num)) {
        const tol = 0.0005;
        where.$or.push(
          { lat: { $gte: num - tol, $lte: num + tol } },
          { lng: { $gte: num - tol, $lte: num + tol } },
        );
      }
    }

    const [userLocations, user] = await Promise.all([
      this.locationRepository.find(where, { orderBy: { createdAt: 'DESC' } }),
      this.usersRepository.findOne({ uuid }),
    ]);

    const defaultUuid = user?.defaultLocation?.uuid ?? null;

    const items = userLocations.map((loc) => ({
      ...wrap(loc).toObject(),
      isDefault: loc.uuid === defaultUuid,
    }));

    return {
      status: true,
      data: defaultOnly === 'true' ? items.filter((i) => i.isDefault) : items,
    };
  }

  async setLocationAsDefault(locationUuid: string, { uuid }: IAuthContext) {
    const userExists = await this.usersRepository.findOne({ uuid });
    userExists.defaultLocation =
      this.locationRepository.getReference(locationUuid);
    await this.em.flush();
  }

  async deleteLocation(locationUuid: string, { uuid }: IAuthContext) {
    const locationExists = await this.locationRepository.findOne({
      uuid: locationUuid,
      user: { uuid },
    });
    if (!locationExists) throw new NotFoundException('Location not found');
    locationExists.deletedAt = new Date();
    return { status: true };
  }

  async savePrices(dto: SavePricesDto, { uuid, userType }: IAuthContext) {
    const userExists = await this.usersRepository.findOne({ uuid });
    if (!userExists) throw new NotFoundException('User not found');
    userExists.offerStartingPrice = dto.offerStartingPrice;
    userExists.minimumOfferPrice = dto.minimumOfferPrice;
    userExists.providerOnboarding = {
      ...userExists.providerOnboarding,
      step3: true,
    };
    userExists.onboardingCompleted = true;
    if (!userExists.userTypes.includes(userType)) {
      const splittedUserTypes = userExists.userTypes.split(',');
      splittedUserTypes.push(userType);
      userExists.userTypes = splittedUserTypes.join(',');
      const walletModel = this.walletRepository.create({
        uuid: v4(),
        totalBalance: 0,
        availableBalance: 0,
        user: this.usersRepository.getReference(uuid),
        userType,
      });
      this.em.persist(walletModel);
    }
    await this.em.flush();
    return { status: true };
  }

  async saveProviderDetails(dto: SaveProviderDetails, { uuid }: IAuthContext) {
    const userExists = await this.usersRepository.findOne({ uuid });
    if (!userExists) throw new NotFoundException('User not found');
    userExists.primaryJobRole = this.subCategoryRepository.getReference(
      dto.subCategoryUuid,
    );
    userExists.serviceDescription = dto.serviceDescription;
    userExists.serviceImages = dto.serviceImages;
    userExists.providerOnboarding = {
      ...userExists.providerOnboarding,
      step2: true,
    };
    await this.em.flush();
    return { status: true };
  }

  async fetchProviderDashboard({ uuid }: IAuthContext) {
    const user = await this.usersRepository.findOne({ uuid });
    if (!user) throw new NotFoundException('User not found');
    const providerStats = await this.em.getConnection().execute(
      `
      WITH tx AS (
        SELECT COALESCE(SUM(t.amount), 0) AS todaysEarnings
        FROM wallets w
        JOIN transactions t ON t.wallet = w.uuid
        WHERE w.user = ?
          AND DATE(t.created_at) = CURDATE()
          AND t.locked = 0
      ),
      decisions AS (
        SELECT
          SUM(o.status IN ('ACCEPTED','DECLINED','COUNTERED')) AS totalDecisions,
          SUM(o.status = 'ACCEPTED')                           AS acceptedOffers
        FROM conversations c
        JOIN messages m ON m.conversation = c.uuid
        JOIN offers   o ON o.uuid = m.offer
        WHERE c.service_provider = ?
      )
      SELECT
        tx.todaysEarnings,
        decisions.totalDecisions,
        decisions.acceptedOffers,
        CASE WHEN decisions.totalDecisions = 0 THEN 0
            ELSE ROUND(decisions.acceptedOffers / decisions.totalDecisions * 100, 2)
        END AS acceptanceRate
      FROM tx, decisions
    `,
      [uuid, uuid],
    );
    let jobGoal = 15;
    switch (user.tier) {
      case AccountTier.SILVER:
        jobGoal = 50;
        break;
      case AccountTier.GOLD:
        jobGoal = 200;
        break;
    }
    return { status: true, data: { user, ...providerStats[0], jobGoal } };
  }

  async fetchTopRatedProviders(conn: Connection) {
    const topRatedProviders = await conn.execute(`
      SELECT u.uuid, u.firstname, u.lastname, u.avg_rating as avgRating, u.service_description as serviceDescription, r.name as primaryJobRole,
      u.offer_starting_price as offerStartingPrice, u.availability, u.engaged, COUNT(j.uuid) as completedJobs,
      u.tier, u.picture, u.service_images as serviceImages
      FROM users u
      LEFT JOIN sub_categories r on u.primary_job_role = r.uuid
      LEFT JOIN jobs j on j.service_provider = u.uuid and j.status = 'completed'
      WHERE u.avg_rating IS NOT NULL
      AND u.primary_job_role IS NOT NULL
      AND u.availability = TRUE
      AND u.identity_verified = TRUE
      GROUP BY u.uuid
      ORDER BY (
        (u.avg_rating * 2) +
        (CASE u.tier 
          WHEN 'PLATINUM' THEN 7
          WHEN 'GOLD' THEN 5
          WHEN 'SILVER' THEN 3
          WHEN 'BRONZE' THEN 1
          ELSE 0
        END)
      ) DESC,
      u.last_logged_in DESC
      LIMIT 10
    `);
    return topRatedProviders;
  }

  async fetchRecommendedProviders(
    conn: Connection,
    locationSelect: string,
    topRatedPlaceholders: string,
    hasLocation: boolean,
    lat: number,
    lng: number,
    topRatedUuids: string[],
  ) {
    const recommendedProviders = await conn.execute(
      `
      SELECT u.uuid, u.firstname, u.lastname, u.avg_rating as avgRating, u.service_description as serviceDescription, r.name as primaryJobRole,
      u.offer_starting_price as offerStartingPrice, u.availability, u.engaged, COUNT(j.uuid) as completedJobs,
      u.tier, u.picture, u.service_images as serviceImages,
      ${locationSelect}
      FROM users u
      LEFT JOIN locations l ON l.uuid = u.default_location
      LEFT JOIN sub_categories r on u.primary_job_role = r.uuid
      LEFT JOIN jobs j on j.service_provider = u.uuid and j.status = 'completed'
      WHERE u.availability = true AND u.identity_verified = true AND u.primary_job_role IS NOT NULL
      ${topRatedPlaceholders ? `AND u.uuid NOT IN (${topRatedPlaceholders})` : ''}
      GROUP BY u.uuid
      ORDER BY (
        (u.avg_rating * 2) +
        (CASE u.tier 
          WHEN 'PLATINUM' THEN 7
          WHEN 'GOLD' THEN 5
          WHEN 'SILVER' THEN 3
          WHEN 'BRONZE' THEN 1
          ELSE 0
        END) +
        (COALESCE(u.engaged, 0) / 2) +
        (DATEDIFF(CURDATE(), u.last_logged_in) * -0.3) +
        (${hasLocation ? 'LEAST(10 / (1 + distance), 5)' : '0'})
      ) DESC,
      u.last_logged_in DESC
      LIMIT 10 
    `,
      hasLocation ? [lat, lng, lat, ...topRatedUuids] : [...topRatedUuids],
    );
    return recommendedProviders;
  }

  async fetchAllProviders(
    conn: Connection,
    locationSelect: string,
    hasLocation: boolean,
    notInPlaceholders: string,
    filtersSql: string,
    allProvidersParams: any[],
  ) {
    const baseProvidersQuery = `
      FROM users u
      LEFT JOIN sub_categories r ON u.primary_job_role = r.uuid
      LEFT JOIN main_categories mc ON r.main_category = mc.uuid
      LEFT JOIN jobs j ON j.service_provider = u.uuid AND j.status = 'completed'
      LEFT JOIN job_reviews jr ON jr.reviewed_for = u.uuid
      LEFT JOIN locations l ON l.uuid = u.default_location
      WHERE u.availability = true AND u.identity_verified = true
        AND u.service_description IS NOT NULL
        AND u.primary_job_role IS NOT NULL
        AND u.offer_starting_price IS NOT NULL
        ${notInPlaceholders ? `AND u.uuid NOT IN (${notInPlaceholders})` : ''}
        ${filtersSql}
    `;
    const providersDataQuery = `
      SELECT
        u.uuid, u.firstname, u.lastname, u.avg_rating as avgRating,
        u.service_description as serviceDescription, r.name as primaryJobRole,
        u.offer_starting_price as offerStartingPrice, u.availability, u.engaged,
        COUNT(j.uuid) as completedJobs, COUNT(jr.uuid) as totalRatings,
        u.tier, u.picture, u.service_images as serviceImages,
        ${locationSelect}
      ${baseProvidersQuery}
      GROUP BY u.uuid
      ORDER BY ${hasLocation ? 'distance ASC,' : ''} RAND()
      LIMIT ? OFFSET ?
    `;
    const providersCountQuery = `
      SELECT COUNT(*) AS total FROM (
        SELECT u.uuid
        ${baseProvidersQuery}
        GROUP BY u.uuid
      ) AS count_subquery
    `;
    return Promise.all([
      conn.execute(providersDataQuery, allProvidersParams),
      conn.execute(
        providersCountQuery,
        allProvidersParams.slice(0, allProvidersParams.length - 2),
      ),
    ]);
  }

  async fetchClientDashboard(
    pagination: PaginationInput,
    filter: ClientDashboardFilter,
    { uuid }: IAuthContext,
  ) {
    const user = await this.usersRepository.findOne({
      uuid,
    });
    if (!user) throw new NotFoundException(`User not found`);
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    const search = filter?.search?.toLowerCase().trim() ?? '';
    const hasLocation =
      user.defaultLocation?.lat != null && user.defaultLocation?.lng != null;
    const conn = this.em.getConnection();
    const isSearchPage = filter && filter?.isSearchPage;
    const topRatedProviders = isSearchPage
      ? []
      : await this.fetchTopRatedProviders(conn);
    const topRatedUuids: string[] = topRatedProviders.map(
      (u: { uuid: string }) => u.uuid,
    );
    const topRatedPlaceholders: string = topRatedUuids.length
      ? topRatedUuids.map(() => '?').join(', ')
      : null;
    const locationSelect = hasLocation
      ? `
        (
          6371 * acos(
            cos(radians(?)) * cos(radians(l.lat)) *
            cos(radians(l.lng) - radians(?)) +
            sin(radians(?)) * sin(radians(l.lat))
          )
        ) AS distance`
      : 'NULL AS distance';
    const recommendedProviders = isSearchPage
      ? []
      : await this.fetchRecommendedProviders(
          conn,
          locationSelect,
          topRatedPlaceholders,
          hasLocation,
          user.defaultLocation?.lat,
          user.defaultLocation?.lng,
          topRatedUuids,
        );
    const recommendedUuids = recommendedProviders.map(
      (u: { uuid: string }) => u.uuid,
    );
    const notInUuids = [...topRatedUuids, ...recommendedUuids];
    const notInPlaceholders = notInUuids.length
      ? notInUuids.map(() => '?').join(', ')
      : null;
    const allProvidersParams: any[] = [];
    let allProvidersFiltersSql = '';
    allProvidersFiltersSql += appendCondition(
      'AND mc.uuid',
      allProvidersParams,
      filter?.mainCategory,
    );
    allProvidersFiltersSql += appendCondition(
      'AND u.primary_job_role',
      allProvidersParams,
      filter?.subCategory,
    );
    allProvidersFiltersSql += appendCondition(
      'AND u.offer_starting_price >=',
      allProvidersParams,
      filter?.priceRange?.minPrice,
    );
    allProvidersFiltersSql += appendCondition(
      'AND u.offer_starting_price <=',
      allProvidersParams,
      filter?.priceRange?.maxPrice,
    );
    allProvidersFiltersSql += appendCondition(
      'AND u.avg_rating >=',
      allProvidersParams,
      filter?.minRating,
    );
    allProvidersFiltersSql += appendCondition(
      'AND LOWER(l.address) LIKE LOWER',
      allProvidersParams,
      filter?.address ? `%${filter?.address}%` : undefined,
    );
    allProvidersFiltersSql += appendCondition(
      'AND u.engaged',
      allProvidersParams,
      filter?.engaged,
    );
    if (search) {
      allProvidersParams.push(...Array(11).fill(`%${search.toLowerCase()}%`));
      allProvidersFiltersSql += `
        AND (
          LOWER(u.firstname) LIKE ? OR LOWER(u.lastname) LIKE ? OR LOWER(u.middlename) LIKE ? OR
          LOWER(mc.name) LIKE ? OR LOWER(r.name) LIKE ? OR LOWER(l.address) LIKE ? OR
          u.avg_rating LIKE ? OR u.offer_starting_price LIKE ? OR LOWER(u.email) LIKE ? OR
          u.phone LIKE ? OR LOWER(u.gender) LIKE ?
        )
      `;
    }
    allProvidersParams.push(...notInUuids);
    if (hasLocation) {
      allProvidersParams.push(
        user.defaultLocation?.lat,
        user.defaultLocation?.lng,
        user.defaultLocation?.lat,
      );
    }
    allProvidersParams.push(Number(limit), Number(offset));
    const [allProviders, totalProviders] = await this.fetchAllProviders(
      conn,
      locationSelect,
      hasLocation,
      notInPlaceholders,
      allProvidersFiltersSql,
      allProvidersParams,
    );
    return {
      status: true,
      data: {
        topRatedProviders,
        recommendedProviders,
        allProviders: buildResponseDataWithPagination(
          allProviders,
          totalProviders[0].total,
          { page, limit },
        ),
      },
    };
  }

  async fetchUserReviews(uuid: string, pagination: PaginationInput) {
    const { page = 1, limit = 20 } = pagination;
    const [data, total] = await this.reviewRepository.findAndCount(
      {
        reviewedFor: { uuid },
      },
      { limit, offset: (page - 1) * limit, orderBy: { createdAt: 'DESC' } },
    );
    return buildResponseDataWithPagination(data, total, { page, limit });
  }

  async updateServiceDescription(
    serviceDescription: string,
    { uuid }: IAuthContext,
  ) {
    const user = await this.usersRepository.findOne({ uuid });
    user.serviceDescription = serviceDescription;
    await this.em.flush();
    return { status: true };
  }

  async updatePrices(dto: UpdatePricesDto, { uuid }: IAuthContext) {
    const user = await this.usersRepository.findOne({ uuid });
    user.minimumOfferPrice = dto.minimumAcceptableOffer;
    user.offerStartingPrice = dto.startingPrice;
    await this.em.flush();
    return { status: true };
  }

  async withdrawFunds(dto: WithdrawFundsDto, { uuid, userType }: IAuthContext) {
    const wallet = await this.walletRepository.findOne({
      user: { uuid },
      userType,
    });
    if (wallet.availableBalance < dto.amount)
      throw new ForbiddenException(`Insufficient balance`);
    const bankAccount = await this.bankAccountRepository.findOne({
      user: { uuid },
      uuid: dto.bankAccountUuid,
    });
    if (!bankAccount)
      throw new NotFoundException(`Bank account does not exist`);
    const transactionUuid = v4();
    const response = await axios.post(
      `${this.paystackConfig.baseUrl}/transfer`,
      {
        source: 'balance',
        amount: dto.amount * 100,
        recipient: bankAccount.recipientCode,
        reference: transactionUuid,
        reason: `Payout`,
      },
      {
        headers: {
          Authorization: `Bearer ${this.paystackConfig.secretKey}`,
        },
      },
    );
    const status = response.data.data.status;
    if (status !== 'disabled') {
      throw new InternalServerErrorException(
        `Kindly contact admin to ensure that OTP is disabled for transfers on this account`,
      );
    }
    const transactionModel = this.transactionRepository.create({
      uuid: transactionUuid,
      type: TransactionType.DEBIT,
      status: TransactionStatus.PENDING,
      amount: dto.amount,
      wallet: this.walletRepository.getReference(wallet.uuid),
      remark: 'Payout',
      locked: false,
    });
    this.em.persist(transactionModel);
    wallet.availableBalance -= dto.amount;
    await this.em.flush();
  }

  async addBankAccount(dto: BankAccountDto, { uuid }: IAuthContext) {
    const duplicateExists = await this.bankAccountRepository.findOne({
      accountNumber: dto.accountNumber,
      bankCode: dto.bankCode,
      user: { uuid },
    });
    if (duplicateExists) throw new ConflictException(`Record already exists`);
    const response = await axios.post(
      `${this.paystackConfig.baseUrl}/transferrecipient`,
      {
        type: 'nuban',
        name: dto.accountName,
        account_number: dto.accountNumber,
        bank_code: dto.bankCode,
        currency: 'NGN',
      },
      {
        headers: {
          Authorization: `Bearer ${this.paystackConfig.secretKey}`,
        },
      },
    );
    const recipientCode = response.data.data.recipient_code;
    const bankAccountModel = this.bankAccountRepository.create({
      uuid: v4(),
      accountNumber: dto.accountNumber,
      accountName: dto.accountName,
      bankName: dto.bankName,
      bankCode: dto.bankCode,
      recipientCode,
      user: this.usersRepository.getReference(uuid),
    });
    this.em.persist(bankAccountModel);
    await this.em.flush();
    return { status: true };
  }

  async getBankAccounts({ uuid }: IAuthContext) {
    const accounts = await this.bankAccountRepository.find({
      user: { uuid },
    });
    return { status: true, data: accounts };
  }

  async deleteBankAccount(bankAccountUuid: string, { uuid }: IAuthContext) {
    const bankAccountExists = await this.bankAccountRepository.findOne({
      uuid: bankAccountUuid,
      user: { uuid },
    });
    if (!bankAccountExists)
      throw new NotFoundException(`Bank account does not exist`);
    bankAccountExists.deletedAt = new Date();
    await this.em.flush();
    return { status: true };
  }

  async resolveBankAccount(dto: ResolveBankAccountDto) {
    const response = await axios.get(
      `${this.paystackConfig.baseUrl}/bank/resolve?account_number=${dto.accountNumber}&bank_code=${dto.bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${this.paystackConfig.secretKey}`,
        },
      },
    );
    return { status: true, data: response.data };
  }

  async updateOffer(
    offerUuid: string,
    offer: Partial<SendOfferDto>,
    { uuid }: IAuthContext,
  ) {
    const messageExists = await this.messageRepository.findOne({
      from: { uuid },
      offer: { uuid: offerUuid },
    });
    if (!messageExists) throw new NotFoundException('Message does not exist');
    const offerExists = await this.offerRepository.findOne({ uuid: offerUuid });
    if (!offerExists) throw new NotFoundException(`Offer does not exist`);
    if (offerExists.status !== OfferStatus.PENDING)
      throw new ForbiddenException(`Offer status cannot be updated`);
    if (offer.amount) offerExists.price = offer.amount;
    if (offer.description) offerExists.description = offer.description;
    if (offer.attachments) offerExists.pictures = offer.attachments.join(',');
    await this.em.flush();
    this.ws.offerUpdated({
      uuid: offerExists.uuid,
      conversationUuid: messageExists.conversation?.uuid,
      ...offerExists,
    });
    return { status: true };
  }

  async cancelOffer(
    offerUuid: string,
    dto: CancelOfferDto,
    { uuid }: IAuthContext,
  ) {
    const messageExists = await this.messageRepository.findOne({
      from: { uuid },
      offer: { uuid: offerUuid },
    });
    if (!messageExists) throw new NotFoundException('Message does not exist');
    const offerExists = await this.offerRepository.findOne({ uuid: offerUuid });
    if (!offerExists) throw new NotFoundException(`Offer does not exist`);
    if (offerExists.status !== OfferStatus.PENDING)
      throw new ForbiddenException(`Offer status cannot be updated`);
    offerExists.status = OfferStatus.CANCELLED;
    offerExists.cancelledReason = dto.reason;
    offerExists.cancelledReasonCategory = dto.reasonCategory;
    const conversation = await this.conversationRepository.findOne({
      uuid: messageExists.conversation.uuid,
    });
    conversation.cancellationChances -= 1;
    if (conversation.cancellationChances < 1) {
      conversation.locked = true;
      conversation.lastLockedAt = new Date();
      conversation.cancellationChances = 3;
    }
    await this.em.flush();
    this.ws.offerUpdated({
      uuid: offerExists.uuid,
      conversationUuid: messageExists.conversation?.uuid,
      ...offerExists,
    });
    return { status: true };
  }

  async acceptOffer(offerUuid: string, { uuid }: IAuthContext) {
    const messageExists = await this.messageRepository.findOne({
      to: { uuid },
      offer: { uuid: offerUuid },
    });
    if (!messageExists) throw new NotFoundException('Message does not exist');
    const offerExists = await this.offerRepository.findOne({ uuid: offerUuid });
    if (!offerExists) throw new NotFoundException(`Offer does not exist`);
    if (offerExists.status !== OfferStatus.PENDING)
      throw new ForbiddenException(`Offer status cannot be updated`);
    offerExists.status = OfferStatus.ACCEPTED;
    await this.em.flush();
    this.ws.offerUpdated({
      uuid: offerExists.uuid,
      conversationUuid: messageExists.conversation?.uuid,
      ...offerExists,
    });
    return { status: true };
  }

  async counterOffer(
    offerUuid: string,
    dto: CounterOfferDto,
    { uuid }: IAuthContext,
  ) {
    const messageExists = await this.messageRepository.findOne({
      to: { uuid },
      offer: { uuid: offerUuid },
    });
    if (!messageExists) throw new NotFoundException('Message does not exist');
    const offerExists = await this.offerRepository.findOne({ uuid: offerUuid });
    if (!offerExists) throw new NotFoundException(`Offer does not exist`);
    if (offerExists.status !== OfferStatus.PENDING)
      throw new ForbiddenException(`Offer status cannot be updated`);
    offerExists.status = OfferStatus.COUNTERED;
    const newOfferUuid = v4();
    const offerModel = this.offerRepository.create({
      ...offerExists,
      uuid: newOfferUuid,
      price: dto.amount,
      counterReason: dto.reason,
      currentOffer: this.offerRepository.getReference(offerUuid),
      status: OfferStatus.PENDING,
    });
    const conversation = await this.conversationRepository.findOne({
      uuid: messageExists.conversation.uuid,
    });
    const messageModel = this.messageRepository.create({
      uuid: v4(),
      conversation: this.conversationRepository.getReference(conversation.uuid),
      from: this.usersRepository.getReference(uuid),
      to: this.usersRepository.getReference(messageExists.from?.uuid),
      type: MessageType.OFFER,
      offer: this.offerRepository.getReference(offerModel.uuid),
    });
    conversation.lastMessage = this.messageRepository.getReference(
      messageModel.uuid,
    );
    this.em.persist(offerModel);
    this.em.persist(messageModel);
    await this.em.flush();
    this.ws.offerCountered({
      conversationUuid: messageExists.conversation?.uuid,
      toUuid: messageExists.from?.uuid,
      oldOffer: offerExists,
      newOffer: offerModel,
    });
    this.readService.markConversationRead(
      uuid,
      messageExists.conversation?.uuid,
    );
    return { status: true };
  }

  async declineOffer(
    offerUuid: string,
    dto: CancelOfferDto,
    { uuid }: IAuthContext,
  ) {
    const messageExists = await this.messageRepository.findOne({
      to: { uuid },
      offer: { uuid: offerUuid },
    });
    if (!messageExists) throw new NotFoundException('Message does not exist');
    const offerExists = await this.offerRepository.findOne({ uuid: offerUuid });
    if (!offerExists) throw new NotFoundException(`Offer does not exist`);
    if (offerExists.status !== OfferStatus.PENDING)
      throw new ForbiddenException(`Offer status cannot be updated`);
    offerExists.status = OfferStatus.DECLINED;
    offerExists.declinedReason = dto.reason;
    offerExists.declinedReasonCategory = dto.reasonCategory;
    const conversation = await this.conversationRepository.findOne({
      uuid: messageExists.conversation.uuid,
    });
    conversation.cancellationChances -= 1;
    if (conversation.cancellationChances < 1) {
      conversation.locked = true;
      conversation.lastLockedAt = new Date();
      conversation.cancellationChances = 3;
    }
    const messageModel = this.messageRepository.create({
      uuid: v4(),
      conversation: this.conversationRepository.getReference(conversation.uuid),
      from: this.usersRepository.getReference(uuid),
      to: this.usersRepository.getReference(messageExists.from?.uuid),
      type: MessageType.OFFER,
      offer: this.offerRepository.getReference(offerExists.uuid),
      message: dto.reason,
    });
    conversation.lastMessage = this.messageRepository.getReference(
      messageModel.uuid,
    );
    this.em.persist(messageModel);
    await this.em.flush();
    this.ws.offerUpdated({
      uuid: offerExists.uuid,
      conversationUuid: conversation.uuid,
      status: OfferStatus.DECLINED,
      ...offerExists,
    });
    this.readService.markConversationRead(uuid, conversation.uuid);
    return { status: true };
  }

  async sendOffer(
    providerUuid: string,
    offer: SendOfferDto,
    { uuid }: IAuthContext,
  ) {
    const providerExists = await this.usersRepository.findOne({
      uuid: providerUuid,
    });
    if (!providerExists) throw new NotFoundException('Provider does not exist');
    if (!providerExists.primaryJobRole)
      throw new ForbiddenException('User is not a service provider');
    if (!providerExists.availability)
      throw new ForbiddenException('User is not available');
    if (offer.amount < providerExists.minimumOfferPrice)
      throw new BadRequestException(
        `Offer price is too low. Minimum is ${providerExists.minimumOfferPrice}`,
      );
    let conversationExists = await this.conversationRepository.findOne({
      serviceProvider: { uuid: providerUuid },
      serviceRequestor: { uuid },
    });
    if (!conversationExists) {
      conversationExists = this.conversationRepository.create({
        uuid: v4(),
        serviceProvider: this.usersRepository.getReference(providerUuid),
        serviceRequestor: this.usersRepository.getReference(uuid),
        restricted: true,
      });
      this.em.persist(conversationExists);
    }
    const hoursAgo = differenceInHours(
      new Date(),
      conversationExists.lastLockedAt,
    );
    if (
      conversationExists.locked &&
      conversationExists.lastLockedAt &&
      hoursAgo < 24
    ) {
      throw new ForbiddenException(
        `Conversation is locked for 24 hours. ${hoursAgo} left`,
      );
    }
    if (!conversationExists.restricted) {
      throw new ForbiddenException(
        `There is an open job in this conversation so you cannot send offer`,
      );
    }
    if (conversationExists.lastMessage) {
      const lastMessage = await this.messageRepository.findOne({
        uuid: conversationExists.lastMessage?.uuid,
      });
      if (lastMessage.type === MessageType.OFFER) {
        const lastOffer = await this.offerRepository.findOne({
          uuid: lastMessage.offer?.uuid,
        });
        if (lastOffer.status === OfferStatus.PENDING) {
          throw new ForbiddenException(
            `Last offer status is still pending so you cannot send a new offer`,
          );
        }
      }
    }
    if (conversationExists.blocked) {
      throw new ForbiddenException(
        `You have been blocked by this user or you blocked this user`,
      );
    }
    conversationExists.locked = false;
    conversationExists.lastLockedAt = null;
    const offerModel = this.offerRepository.create({
      uuid: v4(),
      price: offer.amount,
      description: offer.description,
      pictures: offer.attachments.join(','),
    });
    const messageModel = this.messageRepository.create({
      uuid: v4(),
      conversation: this.conversationRepository.getReference(
        conversationExists.uuid,
      ),
      from: this.usersRepository.getReference(uuid),
      to: this.usersRepository.getReference(providerUuid),
      type: MessageType.OFFER,
      offer: this.offerRepository.getReference(offerModel.uuid),
    });
    conversationExists.lastMessage = this.messageRepository.getReference(
      messageModel.uuid,
    );
    this.em.persist(offerModel);
    this.em.persist(messageModel);
    await this.em.flush();
    this.ws.offerCreated({
      uuid: offerModel.uuid,
      conversationUuid: conversationExists.uuid,
      fromUuid: uuid,
      toUuid: providerUuid,
      price: offerModel.price,
      status: offerModel.status,
      ...offerModel,
    });
    return { status: true };
  }

  async reportConversation(
    conversationUuid: string,
    dto: ReportConversationDto,
    { uuid }: IAuthContext,
  ) {
    const conversationExists = await this.conversationRepository.findOne({
      uuid: conversationUuid,
    });
    if (!conversationExists)
      throw new NotFoundException(`Conversation not found`);
    const reportModel = this.reportRepository.create({
      uuid: v4(),
      reportCategory: dto.reportCategory,
      description: dto.description,
      pictures: dto.pictures.join(','),
      submittedBy: this.usersRepository.getReference(uuid),
      conversation: this.conversationRepository.getReference(conversationUuid),
    });
    this.em.persist(reportModel);
    conversationExists.blocked = true;
    await this.em.flush();
    return { status: true };
  }

  async sendMessage(
    conversationUuid: string,
    dto: SendMessageDto,
    { uuid }: IAuthContext,
  ) {
    const conversationExists = await this.conversationRepository.findOne({
      uuid: conversationUuid,
    });
    if (!conversationExists)
      throw new NotFoundException(`Conversation not found`);
    if (conversationExists.restricted)
      throw new ForbiddenException(`Conversation is restricted`);
    const receiverUuid =
      uuid === conversationExists.serviceProvider?.uuid
        ? conversationExists.serviceRequestor?.uuid
        : conversationExists.serviceProvider?.uuid;
    const messageModel = this.messageRepository.create({
      uuid: v4(),
      conversation: this.conversationRepository.getReference(conversationUuid),
      from: this.usersRepository.getReference(uuid),
      to: this.usersRepository.getReference(receiverUuid),
      message: dto.message,
      type: MessageType.TEXT,
    });
    this.em.persist(messageModel);
    await this.em.flush();
    this.ws.messageCreated({
      uuid: messageModel.uuid,
      conversationUuid: conversationExists.uuid,
      fromUuid: uuid,
      toUuid: receiverUuid,
      message: dto.message,
      type: MessageType.TEXT,
      createdAt: messageModel.createdAt,
      ...messageModel,
    });
    this.readService.markConversationRead(uuid, conversationExists.uuid);
    return { status: true };
  }

  async fetchProviderConversations(
    pagination: PaginationInput,
    { uuid }: IAuthContext,
    search?: string,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    const searchTerm = `%${(search || '').toLowerCase().trim()}%`;

    const baseWhere = `c.service_provider = ?`;
    const searchConditions = `
      LOWER(m.message) LIKE ? OR
      LOWER(rq.firstname) LIKE ? OR
      LOWER(rq.lastname) LIKE ? OR
      LOWER(rq.middlename) LIKE ? OR
      LOWER(rq.phone) LIKE ? OR
      LOWER(rq.email) LIKE ? OR
      LOWER(o.description) LIKE ? OR
      CAST(o.price AS CHAR) LIKE ?
    `;

    const whereClause = search
      ? `${baseWhere} AND (${searchConditions})`
      : baseWhere;

    const params = [uuid];
    if (search) {
      for (let i = 0; i < 8; i++) params.push(searchTerm);
    }

    const dataQuery = `
      SELECT
        c.uuid AS conversationId,
        rq.uuid AS requestorId,
        rq.firstname AS rqFirstname,
        rq.lastname AS rqLastname,
        rq.middlename AS rqMiddlename,
        m.uuid AS lastMessageId,
        m.message AS lastMessage,
        o.description AS offerDescription,
        o.status AS offerStatus,
        c.last_locked_at AS lastLockedAt,
        c.locked,
        c.restricted,
        c.cancellation_chances AS cancellationChances,
        c.created_at AS createdAt,
        crs_me.last_read_at AS myLastReadAt,
        crs_rq.last_read_at AS otherLastReadAt,
        CASE 
          WHEN m.created_at IS NOT NULL
            AND crs_me.last_read_at IS NOT NULL
            AND m.created_at <= crs_me.last_read_at
          THEN 1 ELSE 0
        END AS iReadLastMessage,
        CASE 
          WHEN m.created_at IS NOT NULL
            AND crs_rq.last_read_at IS NOT NULL
            AND m.created_at <= crs_rq.last_read_at
          THEN 1 ELSE 0
        END AS otherReadLastMessage,
      crs_me.unread_count AS myUnreadCount
      FROM conversations c
      LEFT JOIN users rq ON c.service_requestor = rq.uuid
      LEFT JOIN messages m ON c.last_message = m.uuid
      LEFT JOIN offers o ON m.offer = o.uuid
      LEFT JOIN conversation_read_states crs_me ON crs_me.conversation = c.uuid AND crs_me.user = c.service_provider
      LEFT JOIN conversation_read_states crs_rq ON crs_rq.conversation = c.uuid AND crs_rq.user = rq.uuid
      WHERE ${whereClause}
      ORDER BY COALESCE(m.created_at, c.created_at) DESC
      LIMIT ? OFFSET ?
    `;

    const data = await this.em
      .getConnection()
      .execute(dataQuery, [...params, Number(limit), Number(offset)]);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM conversations c
      LEFT JOIN users rq ON c.service_requestor = rq.uuid
      LEFT JOIN messages m ON c.last_message = m.uuid
      LEFT JOIN offers o ON m.offer = o.uuid
      WHERE ${whereClause}
    `;

    const totalResult = await this.em
      .getConnection()
      .execute(countQuery, params);
    const total = totalResult[0]?.total ?? 0;
    const requestorIds: string[] = Array.from(
      new Set((data || []).map((r: any) => r.requestorId).filter(Boolean)),
    );
    const onlineMap = await this.presence.isOnlineMany(requestorIds);
    const shaped = data.map((row: any) => ({
      ...row,
      unreadCount: row.myUnreadCount,
      iReadLastMessage: !!Number(row.iReadLastMessage),
      otherReadLastMessage: !!Number(row.otherReadLastMessage),
      srOnline: !!onlineMap[row.requestorId],
    }));
    return buildResponseDataWithPagination(shaped, total, { page, limit });
  }

  async fetchCustomerConversations(
    pagination: PaginationInput,
    { uuid }: IAuthContext,
    search?: string,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    const searchTerm = `%${(search || '').toLowerCase().trim()}%`;
    const baseWhere = `c.service_requestor = ?`;
    const searchConditions = `
      LOWER(m.message) LIKE ? OR
      LOWER(sp.firstname) LIKE ? OR
      LOWER(sp.lastname) LIKE ? OR
      LOWER(sp.middlename) LIKE ? OR
      LOWER(sp.phone) LIKE ? OR
      LOWER(sp.email) LIKE ? OR
      LOWER(o.description) LIKE ? OR
      CAST(o.price AS CHAR) LIKE ?
    `;

    const whereClause = search
      ? `${baseWhere} AND (${searchConditions})`
      : baseWhere;

    const params = [uuid];
    if (search) {
      for (let i = 0; i < 8; i++) params.push(searchTerm);
    }

    const dataQuery = `
      SELECT
        c.uuid AS conversationId,
        sp.uuid AS serviceProviderId,
        sp.firstname AS spFirstname,
        sp.lastname AS spLastname,
        sp.middlename AS spMiddlename,
        sp.picture AS spPicture,
        sp.tier AS spTier,
        m.uuid AS lastMessageId,
        m.message AS lastMessage,
        o.description AS offerDescription,
        o.status AS offerStatus,
        o.price AS offerPrice,
        c.last_locked_at AS lastLockedAt,
        c.locked,
        c.restricted,
        c.cancellation_chances AS cancellationChances,
        c.created_at AS createdAt,
        crs_me.last_read_at AS myLastReadAt,
        crs_sp.last_read_at AS otherLastReadAt,
        CASE 
          WHEN m.created_at IS NOT NULL
            AND crs_me.last_read_at IS NOT NULL
            AND m.created_at <= crs_me.last_read_at
          THEN 1 ELSE 0
        END AS iReadLastMessage,
        CASE 
          WHEN m.created_at IS NOT NULL
            AND crs_sp.last_read_at IS NOT NULL
            AND m.created_at <= crs_sp.last_read_at
          THEN 1 ELSE 0
        END AS otherReadLastMessage,
      crs_me.unread_count AS myUnreadCount
      FROM conversations c
      LEFT JOIN users sp ON c.service_provider = sp.uuid
      LEFT JOIN messages m ON c.last_message = m.uuid
      LEFT JOIN offers o ON m.offer = o.uuid
      LEFT JOIN conversation_read_states crs_me ON crs_me.conversation = c.uuid AND crs_me.user = c.service_requestor
      LEFT JOIN conversation_read_states crs_sp ON crs_sp.conversation = c.uuid AND crs_sp.user = sp.uuid
      WHERE ${whereClause}
      ORDER BY COALESCE(m.created_at, c.created_at) DESC
      LIMIT ? OFFSET ?
    `;

    const data = await this.em
      .getConnection()
      .execute(dataQuery, [...params, Number(limit), Number(offset)]);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM conversations c
      LEFT JOIN users sp ON c.service_provider = sp.uuid
      LEFT JOIN messages m ON c.last_message = m.uuid
      LEFT JOIN offers o ON m.offer = o.uuid
      WHERE ${whereClause}
    `;

    const totalResult = await this.em
      .getConnection()
      .execute(countQuery, params);
    const total = totalResult[0]?.total ?? 0;
    const providerIds: string[] = Array.from(
      new Set(
        (data || []).map((r: any) => r.serviceProviderId).filter(Boolean),
      ),
    );
    const onlineMap = await this.presence.isOnlineMany(providerIds);
    const shaped = data.map((row: any) => ({
      ...row,
      unreadCount: row.myUnreadCount,
      iReadLastMessage: !!Number(row.iReadLastMessage),
      otherReadLastMessage: !!Number(row.otherReadLastMessage),
      spOnline: !!onlineMap[row.serviceProviderId],
    }));
    return buildResponseDataWithPagination(shaped, total, { page, limit });
  }

  async fetchConversationMessages(
    conversationUuid: string,
    pagination: PaginationInput,
    { uuid }: IAuthContext,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const conversation = await this.conversationRepository.findOne({
      uuid: conversationUuid,
      $or: [{ serviceProvider: { uuid } }, { serviceRequestor: { uuid } }],
    });
    const hoursAgo = differenceInHours(new Date(), conversation.lastLockedAt);
    if (conversation.locked && hoursAgo >= 24) {
      conversation.locked = false;
      conversation.lastLockedAt = null;
    }
    let canSendOffer = true;
    if (conversation.lastMessage) {
      const lastMessage = await this.messageRepository.findOne({
        uuid: conversation.lastMessage?.uuid,
      });
      if (lastMessage.type === MessageType.OFFER) {
        const lastOffer = await this.offerRepository.findOne({
          uuid: lastMessage.offer?.uuid,
        });
        if (lastOffer.status === OfferStatus.PENDING) {
          canSendOffer = false;
        }
      }
    }
    if (canSendOffer) {
      canSendOffer =
        !conversation.locked &&
        conversation.restricted &&
        !conversation.blocked;
    }
    const otherUuid =
      conversation.serviceProvider?.uuid === uuid
        ? conversation.serviceRequestor?.uuid
        : conversation.serviceProvider?.uuid;
    const otherState = await this.conversationReadRepository.findOne({
      conversation: { uuid: conversationUuid },
      user: { uuid: otherUuid },
    });
    const otherLastReadAt: Date | null = otherState?.lastReadAt ?? null;
    const [messages, total] = await this.messageRepository.findAndCount(
      {
        conversation: { uuid: conversationUuid },
      },
      {
        orderBy: { createdAt: OrderDir.DESC },
        populate: ['offer', 'from', 'to'],
      },
    );
    this.readService.markConversationRead(uuid, conversationUuid);
    const data = messages.map((m) => {
      const pojo = wrap(m).toObject();
      const sentByMe = m.from?.uuid === uuid;
      const readByOther = !!(
        sentByMe &&
        otherLastReadAt &&
        m.createdAt <= otherLastReadAt
      );
      return { ...pojo, readByOther };
    });
    this.em.flush();
    return buildResponseDataWithPagination(
      data,
      total,
      { limit, page },
      { canSendOffer },
    );
  }

  async getAnalytics(startDate: Date, endDate: Date, { uuid }: IAuthContext) {
    const start = startDate ? startOfDay(startDate) : startOfDay(new Date());
    const end = endDate ? endOfDay(endDate) : endOfDay(new Date());
    const jobsSql = `
      SELECT
        SUM(CASE WHEN j.created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) AS totalJobs,
        SUM(CASE WHEN j.status = ? AND j.created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) AS completedJobs,
        SUM(CASE WHEN j.status = ? AND j.created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) AS canceledJobs,
        SUM(CASE WHEN j.status = ? AND j.created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) AS disputedJobs,
        COALESCE(SUM(CASE WHEN j.status = ? AND j.end_date BETWEEN ? AND ? THEN j.price ELSE 0 END), 0) AS jobPayment,
        COALESCE(SUM(CASE WHEN j.status = ? AND j.end_date BETWEEN ? AND ? THEN j.tip ELSE 0 END), 0) AS tips,
        COALESCE(SUM(CASE WHEN j.status = ? AND j.end_date BETWEEN ? AND ? THEN j.price * ? ELSE 0 END), 0) AS commission
      FROM jobs j
      WHERE j.service_provider = ?
    `;
    const jobsParams = [
      start,
      end,
      JobStatus.COMPLETED,
      start,
      end,
      JobStatus.CANCELED,
      start,
      end,
      JobStatus.DISPUTED,
      start,
      end,
      JobStatus.COMPLETED,
      start,
      end,
      JobStatus.COMPLETED,
      start,
      end,
      JobStatus.COMPLETED,
      start,
      end,
      0.1,
      uuid,
    ];
    const offersSql = `
      WITH scoped AS (
        SELECT DISTINCT
          o.uuid,
          o.status,
          LOWER(o.declined_reason_category) AS dec_cat,
          LOWER(o.cancelled_reason_category) AS can_cat,
          m.from AS from_user,
          m.to AS to_user,
          m.created_at AS created_at
        FROM messages m
        JOIN offers o ON o.uuid = m.offer
        WHERE (m.from = ? OR m.to = ?)
          AND m.created_at BETWEEN ? AND ?
      ),
      latest AS (
        SELECT s.*
        FROM scoped s 
        LEFT JOIN offers nx ON nx.current_offer = s.uuid
        WHERE nx.uuid IS NULL
      )
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'ACCEPTED' AND to_user = ? THEN 1 ELSE 0 END) AS youAccepted,
        SUM(CASE WHEN status = 'DECLINED' AND (dec_cat = 'provider' OR (dec_cat IS NULL AND to_user = ?)) THEN 1 ELSE 0 END) AS youDeclined,
        SUM(CASE WHEN status = 'CANCELLED' AND (can_cat = 'provider' OR (can_cat IS NULL AND from_user = ?)) THEN 1 ELSE 0 END) AS youCancelled,
        SUM(CASE WHEN status = 'DECLINED' AND (dec_cat = 'client' OR (dec_cat IS NULL AND from_user = ?)) THEN 1 ELSE 0 END) AS clientDeclined,
        SUM(CASE WHEN status = 'CANCELLED' AND (can_cat = 'client' OR (can_cat IS NULL AND from_user <> ?)) THEN 1 ELSE 0 END) AS clientCancelled
      FROM latest
    `;
    const offersParams = [uuid, uuid, start, end, uuid, uuid, uuid, uuid, uuid];
    const [jobsRows, offersRows] = await Promise.all([
      this.em.getConnection().execute(jobsSql, jobsParams),
      this.em.getConnection().execute(offersSql, offersParams),
    ]);
    const j = jobsRows?.[0] ?? {};
    const o = offersRows?.[0] ?? {};
    const jobPayment = Number(j.jobPayment || 0);
    const tips = Number(j.tips || 0);
    const income = jobPayment + tips;
    const commission = Number(j.commission || 0);
    const earnings = income - commission;
    const totalOffers = Number(o.total || 0);
    const youAccepted = Number(o.youAccepted || 0);
    const youDeclined = Number(o.youDeclined || 0);
    const youCancelled = Number(o.youCancelled || 0);
    const clientDeclined = Number(o.clientDeclined || 0);
    const clientCancelled = Number(o.clientCancelled || 0);
    const pct = (n: number, d: number) => (d ? +((n / d) * 100).toFixed(1) : 0);
    const acceptanceRate = pct(youAccepted, totalOffers);
    return {
      range: { start, end },
      revenue: {
        rings: { earnings, tips, commission: -commission },
        breakdown: {
          jobPayment,
          tips,
          income,
          commissionRate:
            income > 0
              ? +((commission / income) * 100).toFixed(2)
              : +(0.1 * 100).toFixed(2),
          deductions: commission,
          yourEarnings: earnings,
        },
      },
      jobs: {
        total: Number(j.totalJobs || 0),
        completed: Number(j.completedJobs || 0),
        canceled: Number(j.canceledJobs || 0),
        disputed: Number(j.disputedJobs || 0),
      },
      offers: {
        total: totalOffers,
        accepted: youAccepted,
        acceptanceRate,
        breakdown: {
          youAccepted: {
            count: youAccepted,
            percent: acceptanceRate,
          },
          youDeclined: {
            count: youDeclined,
            percent: pct(youDeclined, totalOffers),
          },
          youCancelled: {
            count: youCancelled,
            percent: pct(youCancelled, totalOffers),
          },
          clientDeclined: {
            count: clientDeclined,
            percent: pct(clientDeclined, totalOffers),
          },
          clientCancelled: {
            count: clientCancelled,
            percent: pct(clientCancelled, totalOffers),
          },
        },
      },
    };
  }

  async initializePaystackPayment(
    dto: PaymentInfo,
    { uuid, userType, email }: IAuthContext,
  ) {
    const reference = v4();
    const initRes = await axios.post(
      `${this.paystackConfig.baseUrl}/transaction/initialize`,
      {
        email,
        amount: Math.round(dto.amount * 100),
        currency: Currencies.NGN,
        reference,
        metadata: {
          intentId: reference,
          purpose: dto.purpose,
          offerUuid: dto.offerUuid ?? null,
          conversationUuid: dto.conversationUuid ?? null,
          userUuid: uuid,
          userType,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.paystackConfig.secretKey}`,
        },
      },
    );
    const paymentModel = this.paymentRepository.create({
      uuid: reference,
      reference,
      amount: dto.amount,
      currency: Currencies.NGN,
      user: this.usersRepository.getReference(uuid),
      type: PaymentType.INCOMING,
      userType,
      offer: dto.offerUuid
        ? this.offerRepository.getReference(dto.offerUuid)
        : null,
      conversation: dto.conversationUuid
        ? this.conversationRepository.getReference(dto.conversationUuid)
        : null,
      status: 'initialized',
      metadata: JSON.stringify({
        purpose: dto.purpose,
        description: dto.description,
      }),
    });
    this.em.persist(paymentModel);
    await this.em.flush();
    const { authorization_url, access_code } = initRes.data.data;
    return {
      authorizationUrl: authorization_url,
      accessCode: access_code,
      reference,
    };
  }

  async verifyPayment(
    transactionId: string,
    dto: PaymentInfo,
    { uuid, userType }: IAuthContext,
  ) {
    const transResponse = await axios
      .get(
        `${this.paystackConfig.baseUrl}/transaction/verify/${encodeURIComponent(transactionId)}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackConfig.secretKey}`,
          },
        },
      )
      .catch((error) => {
        console.log(error.response);
        throw new InternalServerErrorException(
          `An error occurred while trying to verify the transaction with paystack. Error: ${error}`,
        );
      });
    const paymentData = transResponse.data.data;
    if (paymentData.status.toLowerCase() !== 'success') {
      throw new ForbiddenException(`Transaction was not successful`);
    }
    if (dto.purpose === PaymentPurpose.FUND_WALLET) {
      const wallet = await this.walletRepository.findOne({
        user: { uuid },
        userType,
      });
      wallet.availableBalance += dto.amount;
      wallet.totalBalance += dto.amount;
      const paymentUuid = v4();
      const paymentModel = this.paymentRepository.create({
        uuid: paymentUuid,
        reference: transactionId.toString(),
        metadata: JSON.stringify(paymentData),
        type: PaymentType.INCOMING,
        amount: dto.amount,
        channel: paymentData.paymentMethod,
        status: 'success',
        currency: Currencies.NGN,
      });
      const transactionModel = this.transactionRepository.create({
        uuid: v4(),
        type: TransactionType.CREDIT,
        amount: dto.amount,
        wallet: this.walletRepository.getReference(wallet.uuid),
        payment: this.paymentRepository.getReference(paymentUuid),
        remark: `Wallet Fund`,
        locked: false,
      });
      this.em.persist(paymentModel);
      this.em.persist(transactionModel);
    } else if (dto.purpose === PaymentPurpose.JOB_OFFER) {
      const offerExists = await this.offerRepository.findOne({
        uuid: dto.offerUuid,
      });
      if (!offerExists) throw new NotFoundException('Offer does not exist');
      if (offerExists.price !== +paymentData.amount / 100)
        throw new ForbiddenException(`Amount paid must match offer price`);
      const messageExists = await this.messageRepository.findOne({
        $or: [{ from: { uuid }, to: { uuid } }],
        offer: { uuid: dto.offerUuid },
      });
      if (!messageExists) throw new NotFoundException('Message does not exist');
      const conversation = await this.conversationRepository.findOne({
        uuid: messageExists.conversation?.uuid,
      });
      if (!conversation)
        throw new NotFoundException('Conversation does not exist');
      offerExists.status = OfferStatus.ACCEPTED;
      conversation.locked = false;
      conversation.lastLockedAt = null;
      conversation.cancellationChances = 3;
      conversation.restricted = false;
      const paymentUuid = v4();
      const paymentModel = this.paymentRepository.create({
        uuid: paymentUuid,
        reference: transactionId.toString(),
        metadata: JSON.stringify(paymentData),
        type: PaymentType.INCOMING,
        amount: offerExists.price,
        channel: paymentData.paymentMethod,
        status: 'success',
        currency: Currencies.NGN,
      });
      const jobUuid = v4();
      const jobModel = this.jobRepository.create({
        uuid: jobUuid,
        serviceProvider: this.usersRepository.getReference(
          conversation.serviceProvider?.uuid,
        ),
        serviceRequestor: this.usersRepository.getReference(
          conversation.serviceRequestor?.uuid,
        ),
        description: dto.description,
        requestId: `DH${generateOtp(4)}`,
        price: offerExists.price,
        pictures: offerExists.pictures,
        code: generateOtp(4),
        payment: this.paymentRepository.getReference(paymentUuid),
        acceptedAt: new Date(),
      });
      const jobTimelineModel = this.jobTimelineRepository.create({
        uuid: v4(),
        job: this.jobRepository.getReference(jobUuid),
        event: 'Offer Accepted',
        actor: this.usersRepository.getReference(uuid),
      });
      this.em.persist(jobModel);
      this.em.persist(jobTimelineModel);
      this.em.persist(paymentModel);
      this.ws.jobCreated({
        uuid: jobModel.uuid,
        conversationUuid: conversation.uuid,
        serviceProviderUuid: conversation.serviceProvider?.uuid,
        serviceRequestorUuid: conversation.serviceRequestor?.uuid,
        price: offerExists.price,
        status: jobModel.status,
      });
    }
    await this.em.flush();
    return { status: true };
  }

  async fetchSimilarProviders(selectedUserUuid: string) {
    const similarProviders = await this.em.getConnection().execute(`
      SELECT 
        u.uuid,
        u.firstname,
        u.lastname,
        u.avg_rating as avgRating,
        u.service_description as serviceDescription,
        r.name as primaryJobRole,
        u.offer_starting_price as offerStartingPrice,
        u.availability,
        u.engaged,
        COUNT(j.uuid) as completedJobs,
        u.tier,
        u.picture,
        u.service_images
      FROM users u
      LEFT JOIN jobs j 
        ON j.service_provider = u.uuid AND j.status = 'completed'
      LEFT JOIN sub_category r 
        ON u.primary_job_role = r.uuid
      LEFT JOIN location l 
        ON u.default_location = l.uuid
      INNER JOIN users selected
        ON selected.uuid = '${selectedUserUuid}'
      WHERE u.availability = true
        AND u.uuid != '${selectedUserUuid}'
        AND u.primary_job_role = selected.primary_job_role
      GROUP BY u.uuid
      ORDER BY (
        (u.avg_rating * 2) +
        (CASE u.tier 
          WHEN 'PLATINUM' THEN 7
          WHEN 'GOLD' THEN 5
          WHEN 'SILVER' THEN 3
          WHEN 'BRONZE' THEN 1
          ELSE 0
        END) +
        (COALESCE(u.engaged, 0) / 2) +
        (DATEDIFF(CURDATE(), u.last_logged_in) * -0.3)
      ) DESC,
      u.last_logged_in DESC
      LIMIT 10
    `);
    return { status: true, data: similarProviders };
  }

  async switchUserType(userType: UserType, { uuid }: IAuthContext) {
    const user = await this.usersRepository.findOne({ uuid });
    if (!user) throw new NotFoundException('User not found');
    if (userType === UserType.CUSTOMER) {
      if (!user.userTypes.includes(userType)) {
        const splittedUserTypes = user.userTypes.split(',');
        splittedUserTypes.push(userType);
        user.userTypes = splittedUserTypes.join(',');
        const walletModel = this.walletRepository.create({
          uuid: v4(),
          totalBalance: 0,
          availableBalance: 0,
          user: this.usersRepository.getReference(uuid),
          userType,
        });
        this.em.persist(walletModel);
      }
    }
    const payload: IAuthContext = {
      email: user.email,
      uuid: user.uuid,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
      userType,
    };
    user.lastLoggedIn = new Date();
    await this.em.flush();
    const clonedUser = { ...user, primaryJobRole: user.primaryJobRole?.name };
    delete clonedUser.password;
    delete clonedUser.createdAt;
    delete clonedUser.updatedAt;
    return {
      status: true,
      data: {
        accessToken: this.jwtService.sign(payload),
        expiresIn: 8.64e7,
        refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
        user: clonedUser as any,
      },
    };
  }

  async getWallet({ uuid, userType }: IAuthContext) {
    const wallet = await this.walletRepository.findOne({
      user: { uuid },
      userType,
    });
    return { status: true, data: wallet };
  }

  async getDisputes(
    pagination: PaginationInput,
    filter: DisputeFilter,
    { uuid, userType }: IAuthContext,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    const conditions: FilterQuery<JobDispute> = {
      ...(userType === UserType.CUSTOMER ? { submittedBy: { uuid } } : {}),
      ...(userType === UserType.PROVIDER
        ? { submittedFor: { uuid }, status: DisputeStatus.RESOLVED }
        : {}),
      ...(filter?.status
        ? { status: { $in: filter.status.split(',') as DisputeStatus[] } }
        : {}),
    };
    const [disputes, totalDisputes] = await Promise.all([
      this.disputeRepository.find(
        { ...conditions },
        { limit, offset, populate: ['submittedFor', 'job'] },
      ),
      this.disputeRepository.count({
        ...conditions,
      }),
    ]);
    return { status: true, data: { disputes, totalDisputes } };
  }

  async submitFeedback(dto: FeedbackDto, { uuid, userType }: IAuthContext) {
    const feedbackModel = this.feedbackRepository.create({
      uuid: v4(),
      user: this.usersRepository.getReference(uuid),
      title: dto.title,
      description: dto.description,
      userType,
    });
    this.em.persist(feedbackModel);
    await this.em.flush();
    return { status: true };
  }

  async createDeletionRequest(
    dto: CreateDeletionRequestDto,
    { uuid, userType }: IAuthContext,
  ) {
    const wallet = await this.walletRepository.findOne({
      user: { uuid },
      userType,
    });
    if (wallet.availableBalance)
      throw new ForbiddenException(
        `Please withdraw all available balance first`,
      );
    const accountDeletionModel = this.accountDeletionRepository.create({
      uuid: v4(),
      user: this.usersRepository.getReference(uuid),
      reason: dto.reason,
      userType,
    });
    this.em.persist(accountDeletionModel);
    await this.em.flush();
    return { status: true, data: accountDeletionModel };
  }

  async confirmAccountDeletion(
    deletionRequestUuid: string,
    dto: ConfirmDeletionRequestDto,
    { uuid, userType }: IAuthContext,
  ) {
    const user = await this.usersRepository.findOne({ uuid });
    if (!user) throw new NotFoundException('User not found');
    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid password');
    const deletionRequest = await this.accountDeletionRepository.findOne({
      uuid: deletionRequestUuid,
      userType,
    });
    if (!deletionRequest)
      throw new NotFoundException('Account deletion request not found');
    user.deletedAt = new Date();
    deletionRequest.confirmedAt = new Date();
    await Promise.all([
      this.em.nativeUpdate(
        Location,
        { user: { uuid } },
        { deletedAt: new Date() },
      ),
      this.em.nativeUpdate(
        Wallet,
        { user: { uuid } },
        { deletedAt: new Date() },
      ),
      this.em.flush(),
    ]);
    return { status: true };
  }
}
