import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import {
  AdminUser,
  MainCategory,
  ReasonCategory,
  SubCategory,
} from './admin.entities';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { IAdminAuthContext, UserType } from 'src/types';
import { JwtService } from '@nestjs/jwt';
import {
  AdminInitiateResetPasswordDto,
  AdminDashboardDateFilter,
  AdminDashboardFilterDto,
  AdminDashboardPaginationDto,
  AdminChangePasswordDto,
  AdminCustomerStatus,
  AdminChatHistoryDto,
  AdminFetchCustomerJobsDto,
  AdminFetchCustomersDto,
  AdminSuspendUserDto,
  AdminWalletTransactionsDto,
  AdminNewResetPasswordDto,
  AdminResendOtpDto,
  AdminUserDto,
  AdminVerifyOtpDto,
  CreateMainCategory,
  CreateReasonCategory,
  CreateSubCategory,
  UpdateMainCategory,
  UpdateSubCategory,
} from './dto';
import { v4 } from 'uuid';
import { OTP, Users } from '../users/users.entity';
import { SharedService } from '../shared/shared.service';
import { nanoid } from 'nanoid';
import { buildResponseDataWithPagination, generateOtp } from 'src/utils';
import { JwtAuthConfiguration } from 'src/config/configuration';
import { ConfigType } from '@nestjs/config';
import { Job, JobTimeline } from '../jobs/jobs.entity';
import { JobDispute } from '../jobs/job-dispute.entity';
import { Conversation } from '../conversations/conversations.entity';
import { Message } from 'src/entities/message.entity';
import { Wallet, Transaction } from '../wallet/wallet.entity';

type DateRange = { startDate?: Date; endDate?: Date };

@Injectable()
export class AdminService {
  private readonly monthFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  });

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: EntityRepository<AdminUser>,
    @InjectRepository(MainCategory)
    private readonly mainCategoryRepository: EntityRepository<MainCategory>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: EntityRepository<SubCategory>,
    @InjectRepository(ReasonCategory)
    private readonly reasonCategoryRepository: EntityRepository<ReasonCategory>,
    @InjectRepository(Users)
    private readonly usersRepository: EntityRepository<Users>,
    @InjectRepository(OTP)
    private readonly otpRepository: EntityRepository<OTP>,
    @InjectRepository(Job)
    private readonly jobRepository: EntityRepository<Job>,
    @InjectRepository(JobTimeline)
    private readonly jobTimelineRepository: EntityRepository<JobTimeline>,
    @InjectRepository(JobDispute)
    private readonly jobDisputeRepository: EntityRepository<JobDispute>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: EntityRepository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: EntityRepository<Message>,
    @InjectRepository(Wallet)
    private readonly walletRepository: EntityRepository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: EntityRepository<Transaction>,
    private readonly jwtService: JwtService,
    private readonly sharedService: SharedService,
    @Inject(JwtAuthConfiguration.KEY)
    private readonly jwtConfig: ConfigType<typeof JwtAuthConfiguration>,
    private readonly em: EntityManager,
  ) {}

  private startOfDay(date: Date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private endOfDay(date: Date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  private endOfMonth(date: Date) {
    const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return this.endOfDay(result);
  }

  private startOfWeek(date: Date) {
    const result = this.startOfDay(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + diff);
    return result;
  }

  private resolveDateRange({
    filter,
    startDate,
    endDate,
  }: AdminDashboardFilterDto): DateRange {
    const now = new Date();
    if (filter) {
      switch (filter) {
        case AdminDashboardDateFilter.TODAY: {
          const start = this.startOfDay(now);
          const end = this.endOfDay(now);
          return { startDate: start, endDate: end };
        }
        case AdminDashboardDateFilter.YESTERDAY: {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const start = this.startOfDay(yesterday);
          const end = this.endOfDay(yesterday);
          return { startDate: start, endDate: end };
        }
        case AdminDashboardDateFilter.LAST_WEEK: {
          const startOfCurrentWeek = this.startOfWeek(now);
          const start = new Date(startOfCurrentWeek);
          start.setDate(start.getDate() - 7);
          const end = new Date(startOfCurrentWeek);
          end.setDate(end.getDate() - 1);
          return { startDate: this.startOfDay(start), endDate: this.endOfDay(end) };
        }
        case AdminDashboardDateFilter.LAST_7_DAYS: {
          const start = new Date(now);
          start.setDate(start.getDate() - 6);
          return { startDate: this.startOfDay(start), endDate: this.endOfDay(now) };
        }
        case AdminDashboardDateFilter.THIS_MONTH: {
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return { startDate: this.startOfDay(start), endDate: this.endOfDay(end) };
        }
        case AdminDashboardDateFilter.LAST_30_DAYS: {
          const start = new Date(now);
          start.setDate(start.getDate() - 29);
          return { startDate: this.startOfDay(start), endDate: this.endOfDay(now) };
        }
        case AdminDashboardDateFilter.CUSTOM: {
          if (!startDate || !endDate)
            throw new BadRequestException(
              'Start date and end date are required for custom range',
            );
          const parsedStart = this.startOfDay(new Date(startDate));
          const parsedEnd = this.endOfDay(new Date(endDate));
          if (parsedStart > parsedEnd)
            throw new BadRequestException(
              'Start date cannot be after end date',
            );
          return { startDate: parsedStart, endDate: parsedEnd };
        }
      }
    }
    const manualStart = startDate ? this.startOfDay(new Date(startDate)) : undefined;
    const manualEnd = endDate ? this.endOfDay(new Date(endDate)) : undefined;
    if (manualStart && manualEnd && manualStart > manualEnd)
      throw new BadRequestException('Start date cannot be after end date');
    return { startDate: manualStart, endDate: manualEnd };
  }

  private buildDateWhere(column: string, range: DateRange, params: any[]) {
    if (range.startDate && range.endDate) {
      params.push(range.startDate, range.endDate);
      return `${column} BETWEEN ? AND ?`;
    }
    if (range.startDate) {
      params.push(range.startDate);
      return `${column} >= ?`;
    }
    if (range.endDate) {
      params.push(range.endDate);
      return `${column} <= ?`;
    }
    return '';
  }

  private buildMonthlySeries(endDate: Date, length = 12) {
    const series: { key: string; label: string; date: Date }[] = [];
    for (let i = length - 1; i >= 0; i--) {
      const monthDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      series.push({
        key: this.formatMonthKey(monthDate),
        label: this.monthFormatter.format(monthDate),
        date: monthDate,
      });
    }
    return series;
  }

  private formatMonthKey(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}-01`;
  }

  private resolvePagination(
    pagination?: AdminDashboardPaginationDto,
    defaultLimit = 10,
  ) {
    const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
    const limit =
      pagination?.limit && pagination.limit > 0 ? pagination.limit : defaultLimit;
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  private buildPaginatedResponse<T>(
    items: T[],
    total: number,
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const pages =
      limit > 0 ? Math.ceil(total / limit) || (total ? 1 : 0) : total ? 1 : 0;
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        size: items.length,
        pages,
      },
    };
  }

  private async sendAdminOtp(
    admin: AdminUser,
    options: { templateCode: string; subject: string; data?: Record<string, any> },
  ) {
    const pinId = nanoid();
    const otp = generateOtp();
    const emailData = {
      firstname: admin.fullname,
      otp,
      ...(options.data ?? {}),
    };
    await this.sharedService.sendOtp(otp, null, {
      templateCode: options.templateCode,
      subject: options.subject,
      data: emailData,
      to: admin.email,
    });
    const otpModel = this.otpRepository.create({ uuid: v4(), otp, pinId });
    this.em.persist(otpModel);
    await this.em.flush();
    return pinId;
  }

  private async expireOtp(pinId: string) {
    const otpRecord = await this.otpRepository.findOne({ pinId });
    if (!otpRecord) throw new NotFoundException('Pin ID does not exist');
    if (!otpRecord.expiredAt) {
      otpRecord.expiredAt = new Date();
      await this.em.flush();
    }
    return otpRecord;
  }

  private async validateOtp(pinId: string, otp: string) {
    const otpRecord = await this.otpRepository.findOne({ pinId });
    if (!otpRecord) throw new NotFoundException('Pin ID does not exist');
    if (otpRecord.expiredAt)
      throw new UnauthorizedException('OTP has expired');
    if (otpRecord.otp !== otp)
      throw new UnauthorizedException('Invalid OTP');
    const diffMs = Date.now() - new Date(otpRecord.createdAt).valueOf();
    if (diffMs > 10 * 60 * 1000) {
      otpRecord.expiredAt = new Date();
      await this.em.flush();
      throw new UnauthorizedException('OTP has expired');
    }
    otpRecord.expiredAt = new Date();
    await this.em.flush();
    return otpRecord;
  }

  async findUserByEmail(email: string) {
    return this.adminUserRepository.findOne({ email });
  }

  async validateUser(email: string, password: string) {
    const user = await this.findUserByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) return user;
    throw new UnauthorizedException('Invalid details');
  }

  async login(user: AdminUser) {
    const payload: IAdminAuthContext = {
      uuid: user.uuid,
      name: user.fullname,
      email: user.email,
    };
    const userInfo = await this.findUserByEmail(user.email);
    delete userInfo.password;
    delete userInfo.createdAt;
    delete userInfo.updatedAt;
    return {
      status: true,
      data: {
        accessToken: this.jwtService.sign(payload),
        user: userInfo,
      },
    };
  }

  async initiateLogin(user: AdminUser) {
    const pinId = await this.sendAdminOtp(user, {
      templateCode: 'admin_verify_account',
      subject: 'Admin Login Verification',
    });
    return { status: true, data: { pinId, email: user.email, otpRequired: true } };
  }

  async verifyAdminLoginOtp({ email, otp, pinId }: AdminVerifyOtpDto) {
    const admin = await this.findUserByEmail(email);
    if (!admin) throw new NotFoundException('User not found');
    await this.validateOtp(pinId, otp);
    return this.login(admin);
  }

  async resendAdminLoginOtp({ email, pinId }: AdminResendOtpDto) {
    const admin = await this.findUserByEmail(email);
    if (!admin) throw new NotFoundException('User not found');
    await this.expireOtp(pinId);
    const newPinId = await this.sendAdminOtp(admin, {
      templateCode: 'admin_verify_account',
      subject: 'Admin Login Verification',
    });
    return {
      status: true,
      data: { pinId: newPinId, email: admin.email, otpRequired: true },
    };
  }

  async initiateResetPassword({ email }: AdminInitiateResetPasswordDto) {
    const admin = await this.findUserByEmail(email);
    if (!admin) throw new NotFoundException('User not found');
    const pinId = await this.sendAdminOtp(admin, {
      templateCode: 'reset_password',
      subject: 'Password Reset',
    });
    return { status: true, data: { pinId, email: admin.email } };
  }

  async verifyAdminResetOtp({ email, otp, pinId }: AdminVerifyOtpDto) {
    const admin = await this.findUserByEmail(email);
    if (!admin) throw new NotFoundException('User not found');
    await this.validateOtp(pinId, otp);
    return {
      status: true,
      data: this.jwtService.sign(
        { id: admin.uuid },
        {
          expiresIn: 600,
          secret: this.jwtConfig.adminResetPwdSecretKey,
        },
      ),
    };
  }

  async resendResetPasswordOtp({ email, pinId }: AdminResendOtpDto) {
    const admin = await this.findUserByEmail(email);
    if (!admin) throw new NotFoundException('User not found');
    await this.expireOtp(pinId);
    const newPinId = await this.sendAdminOtp(admin, {
      templateCode: 'reset_password',
      subject: 'Password Reset',
    });
    return { status: true, data: { pinId: newPinId, email: admin.email } };
  }

  async resetAdminPassword(
    { password }: AdminNewResetPasswordDto,
    token: string,
  ) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.jwtConfig.adminResetPwdSecretKey,
      });
    } catch (error) {
      throw new UnauthorizedException(
        'Reset password token has expired. Kindly restart the process.',
      );
    }
    if (!payload?.id)
      throw new UnauthorizedException(
        'Kindly provide a valid access token to reset your password',
      );
    const admin = await this.adminUserRepository.findOne({ uuid: payload.id });
    if (!admin) throw new NotFoundException('User not found');
    const hashedPassword = await bcrypt.hash(password, 12);
    admin.password = hashedPassword;
    await this.em.flush();
    return { status: true };
  }

  async changeAdminPassword(
    { oldPassword, newPassword }: AdminChangePasswordDto,
    { uuid }: IAdminAuthContext,
  ) {
    const admin = await this.adminUserRepository.findOne({ uuid });
    if (!admin) throw new NotFoundException('User not found');
    const passwordMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!passwordMatch)
      throw new BadRequestException('Current password is incorrect');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    admin.password = hashedPassword;
    await this.em.flush();
    return { status: true };
  }

  async fetchDashboardAnalytics(
    dto: AdminDashboardFilterDto,
  ) {
    const range = this.resolveDateRange(dto);
    const connection = this.em.getConnection();
    const now = range.endDate ? new Date(range.endDate) : new Date();
    const monthlyEnd = this.endOfMonth(now);
    const monthlyStartCandidate = new Date(
      monthlyEnd.getFullYear(),
      monthlyEnd.getMonth() - 11,
      1,
    );
    const monthlyStart = range.startDate && range.startDate > monthlyStartCandidate
      ? this.startOfDay(range.startDate)
      : this.startOfDay(monthlyStartCandidate);
    const monthlyRange: DateRange = {
      startDate: monthlyStart,
      endDate: monthlyEnd,
    };
    const monthsSeries = this.buildMonthlySeries(monthlyEnd);

    const financialsParams: any[] = [];
    const financialsWhere = this.buildDateWhere(
      'p.created_at',
      range,
      financialsParams,
    );
    const usersParams: any[] = [];
    const usersWhere = this.buildDateWhere('u.created_at', range, usersParams);
    const jobsParams: any[] = [];
    const jobsWhere = this.buildDateWhere('j.created_at', range, jobsParams);
    const categoryParams: any[] = [];
    const categoryJobDate = this.buildDateWhere(
      'j.created_at',
      range,
      categoryParams,
    );
    const monthlyRevenueParams: any[] = [];
    const monthlyRevenueWhere = this.buildDateWhere(
      'p.created_at',
      monthlyRange,
      monthlyRevenueParams,
    );
    const customerGrowthParams: any[] = [];
    const customerGrowthWhere = this.buildDateWhere(
      'u.created_at',
      monthlyRange,
      customerGrowthParams,
    );
    const locationParams: any[] = [];
    const locationWhere = this.buildDateWhere(
      'u.created_at',
      range,
      locationParams,
    );
    const providersByCategoryParams: any[] = [];
    const providersByCategoryWhere = this.buildDateWhere(
      'u.created_at',
      range,
      providersByCategoryParams,
    );
    const tierParams: any[] = [];
    const tierWhere = this.buildDateWhere(
      'u.created_at',
      range,
      tierParams,
    );
    const ratingParams: any[] = [];
    const ratingWhere = this.buildDateWhere(
      'u.created_at',
      range,
      ratingParams,
    );

    const categoriesPagination = this.resolvePagination(
      dto.categoriesPagination,
    );
    const locationsPagination = this.resolvePagination(
      dto.locationsPagination,
    );
    const providersPagination = this.resolvePagination(
      dto.providersPagination,
    );

    const categoryBaseSql = `
      FROM sub_categories sc
      LEFT JOIN users u ON u.primary_job_role = sc.uuid
        AND u.deleted_at IS NULL
        AND LOWER(COALESCE(u.user_types, '')) LIKE '%provider%'
      LEFT JOIN jobs j ON j.service_provider = u.uuid
        AND j.deleted_at IS NULL
        AND j.status = 'COMPLETED'
        ${categoryJobDate ? `AND ${categoryJobDate}` : ''}
      WHERE sc.deleted_at IS NULL
      GROUP BY sc.uuid, sc.name
    `;

    const categorySelectSql = `
      SELECT
        sc.uuid,
        sc.name,
        COALESCE(SUM(CASE WHEN j.status = 'COMPLETED' THEN j.price ELSE 0 END), 0) AS revenue
      ${categoryBaseSql}
      ORDER BY revenue DESC, sc.name ASC
      LIMIT ? OFFSET ?
    `;

    const categoryCountSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT sc.uuid
        ${categoryBaseSql}
      ) AS category_totals
    `;

    const locationBaseSql = `
      FROM users u
      LEFT JOIN locations l ON l.uuid = u.default_location AND l.deleted_at IS NULL
      WHERE u.deleted_at IS NULL
        AND l.uuid IS NOT NULL
        AND LOWER(COALESCE(u.user_types, '')) LIKE '%customer%'
        ${locationWhere ? `AND ${locationWhere}` : ''}
      GROUP BY l.state, l.lga
    `;

    const topLocationsSelectSql = `
      SELECT
        l.state AS state,
        l.lga AS lga,
        COUNT(u.uuid) AS total
      ${locationBaseSql}
      ORDER BY total DESC, lga ASC
      LIMIT ? OFFSET ?
    `;

    const topLocationsCountSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT l.state, l.lga
        ${locationBaseSql}
      ) AS location_totals
    `;

    const providersBaseSql = `
      FROM sub_categories sc
      LEFT JOIN users u ON u.primary_job_role = sc.uuid
        AND u.deleted_at IS NULL
        AND LOWER(COALESCE(u.user_types, '')) LIKE '%provider%'
        ${providersByCategoryWhere ? `AND ${providersByCategoryWhere}` : ''}
      WHERE sc.deleted_at IS NULL
      GROUP BY sc.uuid, sc.name
    `;

    const providersSelectSql = `
      SELECT
        sc.uuid,
        sc.name,
        COUNT(u.uuid) AS totalProviders
      ${providersBaseSql}
      ORDER BY totalProviders DESC, sc.name ASC
      LIMIT ? OFFSET ?
    `;

    const providersCountSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT sc.uuid
        ${providersBaseSql}
      ) AS provider_totals
    `;

    const [
      financials,
      userTotals,
      jobStatusRows,
      monthlyRevenueRows,
      customerGrowthRows,
      tierRows,
      ratingRows,
    ] = await Promise.all([
      connection.execute(
        `
          SELECT
            COALESCE(SUM(CASE WHEN p.type = 'INCOMING' THEN p.amount ELSE 0 END), 0) AS totalRevenue,
            COALESCE(SUM(CASE WHEN p.type = 'OUTGOING' THEN p.amount ELSE 0 END), 0) AS totalPayout
          FROM payments p
          WHERE p.deleted_at IS NULL
          ${financialsWhere ? `AND ${financialsWhere}` : ''}
        `,
        financialsParams,
      ),
      connection.execute(
        `
          SELECT
            SUM(CASE WHEN LOWER(COALESCE(u.user_types, '')) LIKE '%customer%' THEN 1 ELSE 0 END) AS customers,
            SUM(CASE WHEN LOWER(COALESCE(u.user_types, '')) LIKE '%provider%' THEN 1 ELSE 0 END) AS providers
          FROM users u
          WHERE u.deleted_at IS NULL
          ${usersWhere ? `AND ${usersWhere}` : ''}
        `,
        usersParams,
      ),
      connection.execute(
        `
          SELECT j.status AS status, COUNT(*) AS total
          FROM jobs j
          WHERE j.deleted_at IS NULL
          ${jobsWhere ? `AND ${jobsWhere}` : ''}
          GROUP BY j.status
        `,
        jobsParams,
      ),
      connection.execute(
        `
          SELECT
            sc.uuid,
            sc.name,
            COALESCE(SUM(CASE WHEN j.status = 'COMPLETED' THEN j.price ELSE 0 END), 0) AS revenue
          FROM sub_categories sc
          LEFT JOIN users u ON u.primary_job_role = sc.uuid
            AND u.deleted_at IS NULL
            AND LOWER(COALESCE(u.user_types, '')) LIKE '%provider%'
          LEFT JOIN jobs j ON j.service_provider = u.uuid
            AND j.deleted_at IS NULL
            AND j.status = 'COMPLETED'
            ${categoryJobDate ? `AND ${categoryJobDate}` : ''}
          WHERE sc.deleted_at IS NULL
          GROUP BY sc.uuid, sc.name
          ORDER BY revenue DESC, sc.name ASC
        `,
        categoryParams,
      ),
      connection.execute(
        `
          SELECT DATE_FORMAT(p.created_at, '%Y-%m-01') AS month, COALESCE(SUM(p.amount), 0) AS total
          FROM payments p
          WHERE p.deleted_at IS NULL
            AND p.type = 'INCOMING'
            ${monthlyRevenueWhere ? `AND ${monthlyRevenueWhere}` : ''}
          GROUP BY DATE_FORMAT(p.created_at, '%Y-%m-01')
        `,
        monthlyRevenueParams,
      ),
      connection.execute(
        `
          SELECT DATE_FORMAT(u.created_at, '%Y-%m-01') AS month, COUNT(*) AS total
          FROM users u
          WHERE u.deleted_at IS NULL
            AND LOWER(COALESCE(u.user_types, '')) LIKE '%customer%'
            ${customerGrowthWhere ? `AND ${customerGrowthWhere}` : ''}
          GROUP BY DATE_FORMAT(u.created_at, '%Y-%m-01')
        `,
        customerGrowthParams,
      ),
      connection.execute(
        `
          SELECT u.tier AS tier, COUNT(*) AS total
          FROM users u
          WHERE u.deleted_at IS NULL
            AND LOWER(COALESCE(u.user_types, '')) LIKE '%provider%'
            ${tierWhere ? `AND ${tierWhere}` : ''}
          GROUP BY u.tier
          ORDER BY total DESC, u.tier ASC
        `,
        tierParams,
      ),
      connection.execute(
        `
          SELECT ROUND(u.avg_rating * 2) / 2 AS rating, COUNT(*) AS total
          FROM users u
          WHERE u.deleted_at IS NULL
            AND u.avg_rating IS NOT NULL
            AND LOWER(COALESCE(u.user_types, '')) LIKE '%provider%'
            ${ratingWhere ? `AND ${ratingWhere}` : ''}
          GROUP BY ROUND(u.avg_rating * 2) / 2
          HAVING rating BETWEEN 1 AND 5
        `,
        ratingParams,
      ),
    ]);

    const categorySelectParams = [
      ...categoryParams,
      categoriesPagination.limit,
      categoriesPagination.offset,
    ];
    const categoryCountParams = [...categoryParams];
    const [categoryRevenueRows, categoryTotalRows] = await Promise.all([
      connection.execute(categorySelectSql, categorySelectParams),
      connection.execute(categoryCountSql, categoryCountParams),
    ]);

    const topLocationsSelectParams = [
      ...locationParams,
      locationsPagination.limit,
      locationsPagination.offset,
    ];
    const topLocationsCountParams = [...locationParams];
    const [topLocationsRows, topLocationsTotalRows] = await Promise.all([
      connection.execute(topLocationsSelectSql, topLocationsSelectParams),
      connection.execute(topLocationsCountSql, topLocationsCountParams),
    ]);

    const providersSelectParams = [
      ...providersByCategoryParams,
      providersPagination.limit,
      providersPagination.offset,
    ];
    const providersCountParams = [...providersByCategoryParams];
    const [providersByCategoryRows, providersByCategoryTotalRows] =
      await Promise.all([
        connection.execute(providersSelectSql, providersSelectParams),
        connection.execute(providersCountSql, providersCountParams),
      ]);

    const financialsRow: any = financials[0] ?? {};
    const totalRevenue = Number(financialsRow.totalRevenue ?? 0);
    const totalPayout = Number(financialsRow.totalPayout ?? 0);

    const userTotalsRow: any = userTotals[0] ?? {};
    const totalCustomers = Number(userTotalsRow.customers ?? 0);
    const totalProviders = Number(userTotalsRow.providers ?? 0);

    const jobStats = {
      inProgress: 0,
      completed: 0,
      canceled: 0,
      disputed: 0,
    };
    for (const row of jobStatusRows as any[]) {
      const status = String(row.status ?? '').toUpperCase();
      const total = Number(row.total ?? 0);
      switch (status) {
        case 'IN_PROGRESS':
          jobStats.inProgress = total;
          break;
        case 'COMPLETED':
          jobStats.completed = total;
          break;
        case 'CANCELED':
          jobStats.canceled = total;
          break;
        case 'DISPUTED':
          jobStats.disputed = total;
          break;
      }
    }

    const categoriesTotal = Number(categoryTotalRows[0]?.total ?? 0);
    const revenueByCategoryItems = (categoryRevenueRows as any[]).map((row) => ({
      uuid: row.uuid,
      name: row.name,
      revenue: Number(row.revenue ?? 0),
    }));
    const categoriesByRevenue = this.buildPaginatedResponse(
      revenueByCategoryItems,
      categoriesTotal,
      categoriesPagination,
    );

    const monthlyRevenueMap = new Map(
      (monthlyRevenueRows as any[]).map((row) => [row.month, Number(row.total ?? 0)]),
    );
    const revenueByMonth = monthsSeries.map(({ key, label }) => ({
      month: label,
      total: monthlyRevenueMap.get(key) ?? 0,
      monthKey: key,
    }));

    const customerGrowthMap = new Map(
      (customerGrowthRows as any[]).map((row) => [row.month, Number(row.total ?? 0)]),
    );
    const customerGrowth = monthsSeries.map(({ key, label }) => ({
      month: label,
      total: customerGrowthMap.get(key) ?? 0,
      monthKey: key,
    }));

    const topLocationsTotal = Number(topLocationsTotalRows[0]?.total ?? 0);
    const topLocationsItems = (topLocationsRows as any[]).map((row) => {
      const lga = row.lga ?? 'Unknown';
      const state = row.state ?? 'Unknown';
      return {
        name: `${lga} (${state})`,
        total: Number(row.total ?? 0),
      };
    });
    const topLocations = this.buildPaginatedResponse(
      topLocationsItems,
      topLocationsTotal,
      locationsPagination,
    );

    const providersTotal = Number(providersByCategoryTotalRows[0]?.total ?? 0);
    const providersByCategoryItems = (providersByCategoryRows as any[]).map(
      (row) => ({
        uuid: row.uuid,
        name: row.name,
        totalProviders: Number(row.totalProviders ?? 0),
      }),
    );
    const providersByCategory = this.buildPaginatedResponse(
      providersByCategoryItems,
      providersTotal,
      providersPagination,
    );

    const tierDistribution = (tierRows as any[]).map((row) => ({
      tier: row.tier,
      totalProviders: Number(row.total ?? 0),
    }));

    const ratingRowsMap = new Map(
      (ratingRows as any[]).map((row) => [Number(row.rating).toFixed(1), Number(row.total ?? 0)]),
    );
    const ratingBuckets: number[] = [];
    for (let index = 10; index >= 2; index--) {
      ratingBuckets.push(index / 2);
    }
    const ratingDistribution = ratingBuckets.map((rating) => ({
      rating,
      totalProviders:
        ratingRowsMap.get(rating.toFixed(1)) ?? 0,
    }));

    return {
      status: true,
      data: {
        totals: {
          revenue: totalRevenue,
          payout: totalPayout,
          customers: totalCustomers,
          providers: totalProviders,
          jobs: jobStats,
        },
        revenueByMonth,
        categoriesByRevenue,
        customerGrowthByMonth: customerGrowth,
        topLocations,
        providersByCategory,
        tierDistribution,
        ratingDistribution,
      },
    };
  }

  async fetchCustomers({
    page = 1,
    limit = 20,
    search,
    status,
  }: AdminFetchCustomersDto) {
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 20;
    const offset = (parsedPage - 1) * parsedLimit;
    const conditions: any[] = [{ userTypes: { $like: '%CUSTOMER%' } }];

    if (status === AdminCustomerStatus.SUSPENDED) {
      conditions.push({ suspended: true });
    } else {
      conditions.push({ $or: [{ suspended: false }, { suspended: null }] });
      if (status === AdminCustomerStatus.VERIFIED) {
        conditions.push({ identityVerified: true });
      } else if (status === AdminCustomerStatus.UNVERIFIED) {
        conditions.push({ $or: [{ identityVerified: false }, { identityVerified: null }] });
      }
    }

    if (search) {
      const like = `%${search}%`;
      conditions.push({
        $or: [
          { firstname: { $like: like } },
          { lastname: { $like: like } },
          { email: { $like: like } },
          { phone: { $like: like } },
        ],
      });
    }

    const where = conditions.length > 1 ? { $and: conditions } : conditions[0];

    const [customers, total] = await this.usersRepository.findAndCount(where, {
      limit: parsedLimit,
      offset,
      orderBy: { createdAt: 'DESC' },
      fields: [
        'uuid',
        'firstname',
        'lastname',
        'email',
        'phone',
        'identityVerified',
        'suspended',
        'createdAt',
      ],
    });

    const data = customers.map((user) => ({
      uuid: user.uuid,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phone: user.phone,
      identityVerified: user.identityVerified,
      suspended: user.suspended,
      createdAt: user.createdAt,
      status: user.suspended
        ? AdminCustomerStatus.SUSPENDED
        : user.identityVerified
        ? AdminCustomerStatus.VERIFIED
        : AdminCustomerStatus.UNVERIFIED,
    }));

    return buildResponseDataWithPagination(data, total, {
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  async suspendUser(uuid: string, { reason }: AdminSuspendUserDto) {
    const user = await this.usersRepository.findOne({ uuid });
    if (!user) throw new NotFoundException('User not found');
    if (user.suspended && user.suspensionReason === reason) {
      return { status: true };
    }
    user.suspended = true;
    user.suspensionReason = reason;
    await this.em.flush();
    return { status: true };
  }

  async reactivateUser(uuid: string) {
    const user = await this.usersRepository.findOne({ uuid });
    if (!user) throw new NotFoundException('User not found');
    user.suspended = false;
    user.suspensionReason = null;
    await this.em.flush();
    return { status: true };
  }

  async fetchCustomerJobs(
    customerUuid: string,
    { page = 1, limit = 20, status, search }: AdminFetchCustomerJobsDto,
  ) {
    const customer = await this.usersRepository.findOne({ uuid: customerUuid });
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.userTypes || !customer.userTypes.toUpperCase().includes(UserType.CUSTOMER)) {
      throw new BadRequestException('User is not a customer');
    }

    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 20;
    const offset = (parsedPage - 1) * parsedLimit;

    const connection = this.em.getConnection();
    const baseParams: any[] = [customerUuid];
    let whereSql = `WHERE j.deleted_at IS NULL AND j.service_requestor = ?`;

    if (status) {
      whereSql += ' AND j.status = ?';
      baseParams.push(status);
    }

    if (search) {
      const trimmedSearch = search.trim();
      const lowerSearch = `%${trimmedSearch.toLowerCase()}%`;
      const phoneSearch = `%${trimmedSearch}%`;
      whereSql += ` AND (
        LOWER(j.code) LIKE ?
        OR LOWER(COALESCE(sp.firstname, '')) LIKE ?
        OR LOWER(COALESCE(sp.lastname, '')) LIKE ?
        OR LOWER(COALESCE(sp.email, '')) LIKE ?
        OR COALESCE(sp.phone, '') LIKE ?
      )`;
      baseParams.push(lowerSearch, lowerSearch, lowerSearch, lowerSearch, phoneSearch);
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM jobs j
      LEFT JOIN users sp ON sp.uuid = j.service_provider
      LEFT JOIN sub_categories sc ON sc.uuid = sp.primary_job_role
      ${whereSql}
    `;
    const selectSql = `
      SELECT
        j.uuid,
        j.code,
        j.status,
        j.price,
        j.tip,
        j.created_at,
        j.start_date,
        j.end_date,
        j.accepted_at,
        j.description,
        j.pictures,
        sp.uuid AS service_provider_uuid,
        sp.firstname AS service_provider_firstname,
        sp.lastname AS service_provider_lastname,
        sp.email AS service_provider_email,
        sp.phone AS service_provider_phone,
        sp.picture AS service_provider_picture,
        sp.tier AS service_provider_tier,
        sc.name AS service_provider_category
      FROM jobs j
      LEFT JOIN users sp ON sp.uuid = j.service_provider
      LEFT JOIN sub_categories sc ON sc.uuid = sp.primary_job_role
      ${whereSql}
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const totalRows = await connection.execute(countSql, baseParams);
    const selectParams = [...baseParams, parsedLimit, offset];
    const rows = await connection.execute(selectSql, selectParams);

    const total = Number(totalRows[0]?.total ?? 0);
    const jobs = (rows as any[]).map((row) => ({
      uuid: row.uuid,
      code: row.code,
      status: row.status,
      price: row.price !== null && row.price !== undefined ? Number(row.price) : null,
      tip: row.tip !== null && row.tip !== undefined ? Number(row.tip) : null,
      createdAt: row.created_at,
      startDate: row.start_date,
      endDate: row.end_date,
      acceptedAt: row.accepted_at,
      description: row.description,
      pictures: row.pictures,
      serviceProvider: row.service_provider_uuid
        ? {
            uuid: row.service_provider_uuid,
            firstname: row.service_provider_firstname,
            lastname: row.service_provider_lastname,
            email: row.service_provider_email,
            phone: row.service_provider_phone,
            picture: row.service_provider_picture,
            tier: row.service_provider_tier,
            serviceCategory: row.service_provider_category,
          }
        : null,
      jobCode: row.code,
    }));

    return buildResponseDataWithPagination(jobs, total, {
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  async fetchJobTimelines(jobUuid: string) {
    const job = await this.jobRepository.findOne({ uuid: jobUuid });
    if (!job) throw new NotFoundException('Job not found');
    const timelines = await this.jobTimelineRepository.find(
      { job: { uuid: jobUuid } },
      { orderBy: { createdAt: 'ASC' } },
    );
    return { status: true, data: timelines };
  }

  async fetchJobDispute(jobUuid: string) {
    const job = await this.jobRepository.findOne({ uuid: jobUuid });
    if (!job) throw new NotFoundException('Job not found');
    const dispute = await this.jobDisputeRepository.findOne(
      { job: { uuid: jobUuid } },
      { populate: ['submittedBy', 'submittedFor'] },
    );
    if (!dispute)
      return { status: true, data: null };
    const response = {
      uuid: dispute.uuid,
      code: dispute.code,
      category: dispute.category,
      description: dispute.description,
      pictures: dispute.pictures,
      status: dispute.status,
      submittedBy: dispute.submittedBy
        ? {
            uuid: dispute.submittedBy.uuid,
            firstname: dispute.submittedBy.firstname,
            lastname: dispute.submittedBy.lastname,
            email: dispute.submittedBy.email,
            phone: dispute.submittedBy.phone,
          }
        : null,
      submittedFor: dispute.submittedFor
        ? {
            uuid: dispute.submittedFor.uuid,
            firstname: dispute.submittedFor.firstname,
            lastname: dispute.submittedFor.lastname,
            email: dispute.submittedFor.email,
            phone: dispute.submittedFor.phone,
          }
        : null,
      userType: dispute.userType,
      createdAt: dispute.createdAt,
    };
    return { status: true, data: response };
  }

  async fetchChatHistory({
    customerUuid,
    providerUuid,
    page = 1,
    limit = 20,
  }: AdminChatHistoryDto) {
    const provider = await this.usersRepository.findOne({ uuid: providerUuid });
    if (!provider) throw new NotFoundException('Provider not found');
    const customer = await this.usersRepository.findOne({ uuid: customerUuid });
    if (!customer) throw new NotFoundException('Customer not found');

    const conversation = await this.conversationRepository.findOne({
      serviceProvider: { uuid: providerUuid },
      serviceRequestor: { uuid: customerUuid },
    });

    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 20;
    const offset = (parsedPage - 1) * parsedLimit;

    if (!conversation) {
      return buildResponseDataWithPagination([], 0, {
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    const [messages, total] = await this.messageRepository.findAndCount(
      { conversation: { uuid: conversation.uuid } },
      {
        limit: parsedLimit,
        offset,
        orderBy: { createdAt: 'DESC' },
        populate: ['from', 'to'],
      },
    );

    const data = messages.map((message) => ({
      uuid: message.uuid,
      message: message.message,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
      from: message.from
        ? {
            uuid: message.from.uuid,
            firstname: message.from.firstname,
            lastname: message.from.lastname,
            email: message.from.email,
            phone: message.from.phone,
          }
        : null,
      to: message.to
        ? {
            uuid: message.to.uuid,
            firstname: message.to.firstname,
            lastname: message.to.lastname,
            email: message.to.email,
            phone: message.to.phone,
          }
        : null,
    }));

    return buildResponseDataWithPagination(data, total, {
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  async fetchCustomerWallet(customerUuid: string) {
    const customer = await this.usersRepository.findOne({ uuid: customerUuid });
    if (!customer) throw new NotFoundException('Customer not found');
    const wallet = await this.walletRepository.findOne({
      user: { uuid: customerUuid },
      userType: UserType.CUSTOMER,
    });
    if (!wallet)
      return {
        status: true,
        data: { totalBalance: 0, availableBalance: 0 },
      };
    return {
      status: true,
      data: {
        totalBalance: Number(wallet.totalBalance ?? 0),
        availableBalance: Number(wallet.availableBalance ?? 0),
      },
    };
  }

  async fetchCustomerWalletTransactions(
    customerUuid: string,
    { page = 1, limit = 20, status }: AdminWalletTransactionsDto,
  ) {
    const wallet = await this.walletRepository.findOne({
      user: { uuid: customerUuid },
      userType: UserType.CUSTOMER,
    });
    if (!wallet)
      return buildResponseDataWithPagination([], 0, {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });

    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 20;
    const offset = (parsedPage - 1) * parsedLimit;

    const where: any = { wallet: { uuid: wallet.uuid } };
    if (status) where.status = status;

    const [transactions, total] = await this.transactionRepository.findAndCount(
      where,
      {
        limit: parsedLimit,
        offset,
        orderBy: { createdAt: 'DESC' },
      },
    );

    const data = transactions.map((transaction) => ({
      uuid: transaction.uuid,
      amount: Number(transaction.amount ?? 0),
      status: transaction.status,
      type: transaction.type,
      remark: transaction.remark,
      locked: transaction.locked,
      createdAt: transaction.createdAt,
    }));

    return buildResponseDataWithPagination(data, total, {
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  async createUser(user: AdminUserDto) {
    const userExists = await this.adminUserRepository.findOne({
      email: user.email,
    });
    if (userExists)
      throw new ConflictException(
        `User with email: ${user.email} already exists`,
      );
    const hashedPassword = await bcrypt.hash(user.password, 12);
    const adminUserModel = this.adminUserRepository.create({
      uuid: v4(),
      fullname: user.fullname,
      email: user.email,
      password: hashedPassword,
    });
    this.em.persist(adminUserModel);
    await this.em.flush();
    return { status: true };
  }

  async createMainCategory(dto: CreateMainCategory) {
    const categoryExists = await this.mainCategoryRepository.findOne({
      name: dto.name,
    });
    if (categoryExists)
      throw new ConflictException(
        `Main category with name: ${dto.name} already exists`,
      );
    const mainCategoryModel = this.mainCategoryRepository.create({
      uuid: v4(),
      name: dto.name,
      icon: dto.icon,
    });
    this.em.persist(mainCategoryModel);
    await this.em.flush();
    return { status: true };
  }

  async fetchMainCategories() {
    return {
      status: true,
      data: await this.mainCategoryRepository.findAll({
        populate: ['categories'],
        orderBy: { createdAt: 'DESC' },
      }),
    };
  }

  async editMainCategory(uuid: string, dto: UpdateMainCategory) {
    const categoryExists = await this.mainCategoryRepository.findOne({
      uuid,
    });
    if (!categoryExists)
      throw new NotFoundException(`Main category does not exist`);
    const duplicateCategory = await this.mainCategoryRepository.findOne({
      uuid: { $ne: uuid },
      name: dto.name,
    });
    if (duplicateCategory)
      throw new ConflictException(
        `Main category with name: ${dto.name} already exists`,
      );
    categoryExists.name = dto.name;
    categoryExists.icon = dto.icon;
    await this.em.flush();
    return { status: true };
  }

  async deleteMainCategory(uuid: string) {
    const categoryExists = await this.mainCategoryRepository.findOne({ uuid });
    if (!categoryExists)
      throw new NotFoundException(`Main category does not exist`);
    await this.mainCategoryRepository.nativeDelete({ uuid });
    await this.subCategoryRepository.nativeDelete({ mainCategory: { uuid } });
    return { status: true };
  }

  async createSubCategory(dto: CreateSubCategory) {
    const mainCategoryExists = await this.mainCategoryRepository.findOne({
      uuid: dto.mainCategoryUuid,
    });
    if (!mainCategoryExists)
      throw new NotFoundException(`Main category does not exist`);
    const subCategoryExists = await this.subCategoryRepository.findOne({
      mainCategory: { uuid: dto.mainCategoryUuid },
      name: dto.name,
    });
    if (subCategoryExists)
      throw new ConflictException(
        `Sub-category with name: ${dto.name} already exists`,
      );
    const subCategoryModel = this.subCategoryRepository.create({
      uuid: v4(),
      name: dto.name,
      mainCategory: this.mainCategoryRepository.getReference(
        dto.mainCategoryUuid,
      ),
    });
    this.em.persist(subCategoryModel);
    await this.em.flush();
    return { status: true };
  }

  async fetchSubCategories(mainCategoryUuid: string) {
    return {
      status: true,
      data: await this.subCategoryRepository.findAll({
        where: { mainCategory: { uuid: mainCategoryUuid } },
      }),
    };
  }

  async editSubCategory(uuid: string, dto: UpdateSubCategory) {
    const categoryExists = await this.subCategoryRepository.findOne({
      uuid,
    });
    if (!categoryExists)
      throw new NotFoundException(`Sub-category does not exist`);
    const duplicateCategory = await this.subCategoryRepository.findOne({
      uuid: { $ne: uuid },
      name: dto.name,
    });
    if (duplicateCategory)
      throw new ConflictException(
        `Sub-category with name: ${dto.name} already exists`,
      );
    categoryExists.name = dto.name;
    await this.em.flush();
    return { status: true };
  }

  async deleteSubCategory(uuid: string) {
    await this.subCategoryRepository.nativeDelete({ uuid });
    return { status: true };
  }

  async createReasonCategory(dto: CreateReasonCategory) {
    const categoryExists = await this.reasonCategoryRepository.findOne({
      name: dto.name,
      type: dto.type,
    });
    if (categoryExists)
      throw new ConflictException(
        `Category with name: ${dto.name} for type: ${dto.type} already exists`,
      );
    const categoryModel = this.reasonCategoryRepository.create({
      uuid: v4(),
      name: dto.name,
      type: dto.type,
    });
    this.em.persist(categoryModel);
    await this.em.flush();
    return { status: true };
  }

  async deleteReasonCategory(uuid: string) {
    await this.reasonCategoryRepository.nativeDelete({ uuid });
    return { status: true };
  }
}
