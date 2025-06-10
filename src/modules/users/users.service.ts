import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Users } from './users.entity';
import { SharedService } from '../shared/shared.service';
import {
  ClientDashboardFilter,
  SaveLocationDto,
  SavePricesDto,
  SendOfferDto,
  VerifyIdentityDto,
} from './users.dto';
import { IAuthContext, MessageType } from 'src/types';
import axios, { AxiosResponse } from 'axios';
import { QoreIDConfiguration } from 'src/config/configuration';
import { ConfigType } from '@nestjs/config';
import { v4 } from 'uuid';
import { Location } from 'src/entities/location.entity';
import { PaginationInput } from 'src/base/dto';
import { buildResponseDataWithPagination } from 'src/utils';
import { Conversation, Offer } from '../conversations/conversations.entity';
import { Message } from 'src/entities/message.entity';
import { JobReview } from 'src/entities/job-review.entity';

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
    private readonly sharedService: SharedService,
    @Inject(QoreIDConfiguration.KEY)
    private readonly qoreidConfig: ConfigType<typeof QoreIDConfiguration>,
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

  async saveLocation(dto: SaveLocationDto, { uuid }: IAuthContext) {
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
    });
    if (dto.default) {
      userExists.defaultLocation =
        this.locationRepository.getReference(locationUuid);
    }
    this.em.persist(locationModel);
    await this.em.flush();
    return { status: true };
  }

  async fetchLocations({ uuid }: IAuthContext) {
    return {
      status: true,
      data: await this.locationRepository.findAll({
        where: { user: { uuid } },
      }),
    };
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

  async savePrices(dto: SavePricesDto, { uuid }: IAuthContext) {
    const userExists = await this.usersRepository.findOne({ uuid });
    if (!userExists) throw new NotFoundException('User not found');
    userExists.offerStartingPrice = dto.offerStartingPrice;
    userExists.minimumOfferPrice = dto.minimumOfferPrice;
    await this.em.flush();
    return { status: true };
  }

  async fetchClientDashboard(
    pagination: PaginationInput,
    filter?: ClientDashboardFilter,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const search = filter?.search?.toLowerCase().trim() ?? '';
    const hasLocation = filter?.latitude && filter?.longitude;
    const topRatedProviders = await this.em.getConnection().execute(`
      SELECT u.uuid, u.firstname, u.lastname, u.avg_rating as avgRating, u.service_description as serviceDescription, r.name as primaryJobRole,
      u.offer_starting_price as offerStartingPrice, u.availability, u.engaged, COUNT(j.uuid) as completedJobs,
      u.tier, u.picture, u.service_images
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
    const topRatedUuids = topRatedProviders.map((u) => `'${u.uuid}'`).join(',');
    const recommendedProviders = await this.em.getConnection().execute(`
      SELECT u.uuid, u.firstname, u.lastname, u.avg_rating as avgRating, u.service_description as serviceDescription, r.name as primaryJobRole,
      u.offer_starting_price as offerStartingPrice, u.availability, u.engaged, COUNT(j.uuid) as completedJobs,
      u.tier, u.picture, u.service_images,
      ${
        hasLocation
          ? `
        (
          6371 * acos(
            cos(radians(${filter.latitude}))
            * cos(radians(l.latitude))
            * cos(radians(l.longitude) - radians(${filter.latitude}))
            + sin(radians(${filter.latitude})) * sin(radians(l.latitude))
          )
        ) AS distance`
          : 'NULL AS distance'
      }
      FROM users u
      LEFT JOIN jobs j on j.service_provider = u.uuid and j.status = 'completed'
      WHERE u.availability = true
      AND u.uuid NOT IN (${topRatedUuids})
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
    `);
    const recommendedUuids = recommendedProviders
      .map((u) => `'${u.uuid}'`)
      .join(',');
    const allProviders = await this.em.getConnection().execute(`
      SELECT u.uuid, u.firstname, u.lastname, u.avg_rating as avgRating, u.service_description as serviceDescription, r.name as primaryJobRole,
      u.offer_starting_price as offerStartingPrice, u.availability, u.engaged, COUNT(j.uuid) as completedJobs,
      COUNT(jr.uuid) as totalRatings, u.tier, u.picture, u.service_images,
      ${
        hasLocation
          ? `
        (
          6371 * acos(
            cos(radians(${filter.latitude}))
            * cos(radians(l.latitude))
            * cos(radians(l.longitude) - radians(${filter.latitude}))
            + sin(radians(${filter.latitude})) * sin(radians(l.latitude))
          )
        ) AS distance`
          : 'NULL AS distance'
      }
      FROM users u
      LEFT JOIN sub_categories r on u.primary_job_role = r.uuid
      LEFT JOIN main_categories mc ON r.main_category = mc.uuid
      LEFT JOIN jobs j on j.service_provider = u.uuid and j.status = 'completed'
      LEFT JOIN job_reviews jr on jr.reviewed_for = u.uuid
      LEFT JOIN locations l on l.uuid = u.default_location
      WHERE u.availability = true AND u.service_description IS NOT NULL AND u.primary_job_role IS NOT NULL
      AND u.offer_starting_price iS NOT NULL 
      AND u.uuid NOT IN (${topRatedUuids}, ${recommendedUuids})
      ${filter?.mainCategory ? `AND mc.uuid = '${filter.mainCategory}'` : ''}
      ${filter?.subCategory ? `AND u.primary_job_role = '${filter.subCategory}'` : ''}
      ${filter?.priceRange?.minPrice ? `AND u.offer_starting_price >= ${filter.priceRange.minPrice}` : ''}
      ${filter?.priceRange?.maxPrice ? `AND u.offer_starting_price <= ${filter.priceRange.maxPrice}` : ''}
      ${filter?.minRating ? `AND u.avg_rating >= ${filter.minRating}` : ''}
      ${filter?.address ? `AND l.address = ${filter.address}` : ''}
      ${
        search
          ? `
        AND (
          LOWER(u.firstname) LIKE '%${search}%' OR
          LOWER(u.lastname) LIKE '%${search}%' OR
          LOWER(u.middlename) LIKE '%${search}%' OR
          LOWER(mc.name) LIKE '%${search}%' OR
          LOWER(r.name) LIKE '%${search}%' OR
          LOWER(l.address) LIKE '%${search}%' OR
          u.avg_rating LIKE '%${search}%' OR
          u.offer_starting_price LIKE '%${search}%' OR
          LOWER(u.email) LIKE '%${search}%' OR
          u.phone LIKE '%${search}%' OR
          LOWER(u.gender) LIKE '%${search}%'
        )
        `
          : ''
      }
      GROUP BY u.uuid
      ORDER BY ${hasLocation ? 'distance ASC,' : ''} RAND()
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `);
    return {
      status: true,
      data: { topRatedProviders, recommendedProviders, allProviders },
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
      });
      this.em.persist(conversationExists);
    }
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
}
