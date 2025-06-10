import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ConflictException,
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
import { IAdminAuthContext } from 'src/types';
import { JwtService } from '@nestjs/jwt';
import {
  AdminUserDto,
  CreateMainCategory,
  CreateReasonCategory,
  CreateSubCategory,
  UpdateMainCategory,
  UpdateSubCategory,
} from './dto';
import { v4 } from 'uuid';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: EntityRepository<AdminUser>,
    @InjectRepository(MainCategory)
    private readonly mainCategoryRepository: EntityRepository<MainCategory>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: EntityRepository<SubCategory>,
    @InjectRepository(ReasonCategory)
    private readonly reasonCategoryRepository: EntityRepository<ReasonCategory>,
    private readonly jwtService: JwtService,
    private readonly em: EntityManager,
  ) {}

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
