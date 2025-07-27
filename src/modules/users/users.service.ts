import {
  Connection,
  EntityManager,
  EntityRepository,
  FilterQuery,
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
import { AccountDeletionRequest, Feedback, Users } from './users.entity';
import { SharedService } from '../shared/shared.service';
import {
  CancelOfferDto,
  ClientDashboardFilter,
  ConfirmDeletionRequestDto,
  CreateDeletionRequestDto,
  DisputeFilter,
  FeedbackDto,
  PaymentInfo,
  ReportConversationDto,
  SaveLocationDto,
  SavePricesDto,
  SaveProviderDetails,
  SendMessageDto,
  SendOfferDto,
  VerifyIdentityDto,
} from './users.dto';
import {
  AccountTier,
  Currencies,
  DisputeStatus,
  IAuthContext,
  MessageType,
  OfferStatus,
  OrderDir,
  PaymentPurpose,
  PaymentType,
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
  Payment,
  Report,
} from '../conversations/conversations.entity';
import { Message } from 'src/entities/message.entity';
import { JobReview } from 'src/entities/job-review.entity';
import { differenceInHours } from 'date-fns';
import { Job, JobTimeline } from '../jobs/jobs.entity';
import { JwtService } from '@nestjs/jwt';
import { SubCategory } from '../admin/admin.entities';
import { Transaction, Wallet } from '../wallet/wallet.entity';
import { JobDispute } from '../jobs/job-dispute.entity';
import bcrypt from 'bcryptjs';

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
    private readonly sharedService: SharedService,
    @Inject(QoreIDConfiguration.KEY)
    private readonly qoreidConfig: ConfigType<typeof QoreIDConfiguration>,
    @Inject(PaystackConfiguration.KEY)
    private readonly paystackConfig: ConfigType<typeof PaystackConfiguration>,
    private readonly jwtService: JwtService,
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
          `${this.qoreidConfig.baseUrl}/v1/ng/identities/face-verification/bvn`,
          { idNumber: identity.bvn, photoUrl: identity.photo },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
        axios.post(
          `${this.qoreidConfig.baseUrl}/v1/ng/identities/face-verification/nin`,
          { idNumber: identity.nin, photoUrl: identity.photo },
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
    userExists.bvnData = JSON.stringify(bvnResponse.data);
    userExists.ninData = JSON.stringify(ninResponse.data);
    userExists.identityVerified = true;
    userExists.picture = identity.photo;
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
  ): Promise<any> {
    const [userLocations, user] = await Promise.all([
      this.locationRepository.findAll({
        where: { user: { uuid }, userType },
        orderBy: { createdAt: OrderDir.DESC },
      }),
      this.usersRepository.findOne({ uuid }),
    ]);
    return {
      status: true,
      data:
        defaultOnly === 'true'
          ? userLocations.filter(
              (location) => location.uuid === user.defaultLocation?.uuid,
            )
          : userLocations.map((location) => {
              return {
                ...location,
                isDefault: location.uuid === user.defaultLocation?.uuid,
              };
            }),
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
      SELECT 
        COALESCE(SUM(DISTINCT CASE 
          WHEN DATE(t.created_at) = CURDATE() AND t.locked = FALSE THEN t.amount 
          ELSE 0 END), 0) AS todaysEarnings,

        SUM(CASE WHEN o.status IN ('ACCEPTED', 'DECLINED', 'COUNTERED') THEN 1 ELSE 0 END) AS totalDecisions,
        SUM(CASE WHEN o.status = 'ACCEPTED' THEN 1 ELSE 0 END) AS acceptedOffers,

        CASE 
          WHEN SUM(CASE WHEN o.status IN ('ACCEPTED', 'DECLINED', 'COUNTERED') THEN 1 ELSE 0 END) = 0 THEN 0
          ELSE ROUND(
            (SUM(CASE WHEN o.status = 'ACCEPTED' THEN 1 ELSE 0 END) /
            SUM(CASE WHEN o.status IN ('ACCEPTED', 'DECLINED', 'COUNTERED') THEN 1 ELSE 0 END)) * 100, 2)
        END AS acceptanceRate
      FROM users u
      LEFT JOIN wallets w ON w.user = u.uuid
      LEFT JOIN transactions t ON t.wallet = w.uuid
      LEFT JOIN conversations c ON c.service_provider = u.uuid
      LEFT JOIN messages m ON m.conversation = c.uuid
      LEFT JOIN offers o ON o.uuid = m.offer
      WHERE u.uuid = ?,
    `,
      [uuid],
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
      AND u.availability = TRUE
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
      WHERE u.availability = true
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
      WHERE u.availability = true
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
    const topRatedProviders = await this.fetchTopRatedProviders(conn);
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
            cos(radians(?)) * cos(radians(l.latitude)) *
            cos(radians(l.longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(l.latitude))
          )
        ) AS distance`
      : 'NULL AS distance';
    const recommendedProviders = await this.fetchRecommendedProviders(
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
      'AND mc.uuid =',
      allProvidersParams,
      filter?.mainCategory,
    );
    allProvidersFiltersSql += appendCondition(
      'AND u.primary_job_role =',
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

  async updateOffer(
    offerUuid: string,
    offer: Partial<SendOfferDto>,
    { uuid }: IAuthContext,
  ) {
    const messageExists = await this.messageRepository.findOne({
      from: { uuid },
      offer: { uuid },
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
    return { status: true };
  }

  async cancelOffer(
    offerUuid: string,
    dto: CancelOfferDto,
    { uuid }: IAuthContext,
  ) {
    const messageExists = await this.messageRepository.findOne({
      from: { uuid },
      offer: { uuid },
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
    return { status: true };
  }

  async declineOffer(
    offerUuid: string,
    dto: CancelOfferDto,
    { uuid }: IAuthContext,
  ) {
    const messageExists = await this.messageRepository.findOne({
      to: { uuid },
      offer: { uuid },
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
    await this.em.flush();
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
    return { status: true };
  }

  async fetchUserConversations(
    pagination: PaginationInput,
    { uuid }: IAuthContext,
    search?: string,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    const searchTerm = `%${(search || '').toLowerCase().trim()}%`;
    const data = await this.em.getConnection().execute(
      `
      SELECT
        c.uuid AS conversationId,
        sp.uuid AS serviceProviderId,
        sp.firstname AS spFirstname,
        sp.lastname AS spLastname,
        sp.middlename AS spMiddlename,
        m.uuid AS lastMessageId,
        m.message AS lastMessage,
        o.description AS offerDescription,
        o.status AS offerStatus,
        c.last_locked_at AS lastLockedAt,
        c.locked,
        c.restricted,
        c.cancellation_chances AS cancellationChances,
        c.created_at AS createdAt
      FROM conversations c
      LEFT JOIN users sp ON c.service_provider = sp.uuid
      LEFT JOIN messages m ON c.last_message = m.uuid
      LEFT JOIN offers o ON m.offer = o.uuid
      WHERE c.service_requestor = ?
        ${
          search
            ? `
        AND (
          LOWER(m.message) LIKE ? OR
          LOWER(sp.firstname) LIKE ? OR
          LOWER(sp.lastname) LIKE ? OR
          LOWER(sp.middlename) LIKE ? OR
          LOWER(sp.phone) LIKE ? OR
          LOWER(sp.email) LIKE ? OR
          LOWER(o.description) LIKE ? OR
          CAST(o.price AS CHAR) LIKE ?
        )`
            : ''
        }
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `,
      search
        ? [
            uuid,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            limit,
            offset,
          ]
        : [uuid, limit, offset],
    );
    const totalResult = await this.em.getConnection().execute(
      `
      SELECT COUNT(*) as total
      FROM conversations c
      LEFT JOIN users sp ON c.service_provider = sp.uuid
      LEFT JOIN messages m ON c.last_message = m.uuid
      LEFT JOIN offers o ON m.offer = o.uuid
      WHERE c.service_requestor = ?
        ${
          search
            ? `
        AND (
          LOWER(m.message) LIKE ? OR
          LOWER(sp.firstname) LIKE ? OR
          LOWER(sp.lastname) LIKE ? OR
          LOWER(sp.middlename) LIKE ? OR
          LOWER(sp.phone) LIKE ? OR
          LOWER(sp.email) LIKE ? OR
          LOWER(o.description) LIKE ? OR
          CAST(o.price AS CHAR) LIKE ?
        )`
            : ''
        }
    `,
      search
        ? [
            uuid,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
            searchTerm,
          ]
        : [uuid],
    );
    const total = totalResult[0]?.total ?? 0;
    return buildResponseDataWithPagination(data, total, { page, limit });
  }

  async fetchConversationMessages(
    conversationUuid: string,
    pagination: PaginationInput,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const [data, total] = await this.messageRepository.findAndCount(
      {
        conversation: { uuid: conversationUuid },
      },
      { orderBy: { createdAt: OrderDir.DESC }, populate: ['offer'] },
    );
    return buildResponseDataWithPagination(data, total, { limit, page });
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
        transactionId: transactionId.toString(),
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
        transactionId: transactionId.toString(),
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
