import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BlacklistedTokens, OTP, Users } from '../users/users.entity';
import { SharedService } from '../shared/shared.service';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthConfiguration } from 'src/config/configuration';
import { ConfigType } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import {
  ChangePasswordDto,
  LogoutDto,
  NewResetPasswordDto,
  ResetPasswordDto,
  SendOtpDto,
  SignupStepOneDto,
  VerifyOtpDto,
} from './auth.dto';
import bcrypt from 'bcryptjs';
import { v4 } from 'uuid';
import { nanoid } from 'nanoid';
import { generateOtp } from 'src/utils';
import { IAuthContext, OTPActionType } from 'src/types';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Users)
    private readonly usersRepository: EntityRepository<Users>,
    @InjectRepository(OTP)
    private readonly otpRepository: EntityRepository<OTP>,
    @InjectRepository(BlacklistedTokens)
    private readonly blacklistedTokensRepository: EntityRepository<BlacklistedTokens>,
    private readonly sharedService: SharedService,
    private readonly jwtService: JwtService,
    @Inject(JwtAuthConfiguration.KEY)
    private readonly jwtConfig: ConfigType<typeof JwtAuthConfiguration>,
    private readonly usersService: UsersService,
  ) {}

  async signupStepOne(user: SignupStepOneDto) {
    const phoneNumber = this.sharedService.validatePhoneNumber(user.phone);
    user.phone = phoneNumber.substring(1);
    const existingUser = await this.usersRepository.findOne({
      $or: [{ email: user.email }, { phone: user.phone }],
    });
    if (existingUser) {
      if (existingUser.email === user.email) {
        throw new ConflictException(
          `User with email: ${user.email} already exist`,
        );
      }
      if (existingUser.phone === user.phone) {
        throw new ConflictException(
          `User with phone: ${user.phone.substring(3)} already exist`,
        );
      }
    }
    const hashedPassword = await bcrypt.hash(user.password, 12);
    const pinId = nanoid();
    const otp = generateOtp();
    await this.sharedService.sendOtp(otp, null, {
      templateCode: 'verify_account',
      subject: 'Verify Email',
      data: {
        firstname: user.firstname,
        otp,
      },
      to: user.email,
    });
    const otpModel = this.otpRepository.create({ uuid: v4(), otp, pinId });
    this.em.persist(otpModel);
    const userUuid = v4();
    const userModel = this.usersRepository.create({
      uuid: userUuid,
      email: user.email,
      password: hashedPassword,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
      phoneVerified: false,
      lastLoggedIn: new Date(),
    });
    this.em.persist(userModel);
    await this.em.flush();
    return { status: true, data: { pinId, uuid: userUuid } };
  }

  async validateUser(email: string, password: string) {
    const user = (await this.usersService.findByEmailOrPhone(email))?.data;
    if (!user) throw new NotFoundException('User not found');
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      if (user.deletedAt)
        throw new ForbiddenException('This account is disabled');
      if (!user.emailVerified) {
        const pinId = nanoid();
        const otp = generateOtp();
        await this.sharedService.sendOtp(otp, null, {
          templateCode: 'verify_account',
          subject: 'Verify Email',
          data: {
            firstname: user.firstname,
            otp,
          },
          to: user.email,
        });
        const otpModel = this.otpRepository.create({ uuid: v4(), otp, pinId });
        this.em.persist(otpModel);
        await this.em.flush();
        return { pinId, uuid: user.uuid };
      }
      return user;
    }
    throw new UnauthorizedException('Invalid details');
  }

  async login(user: any) {
    if (user.pinId) return { status: true, data: user };
    const payload: IAuthContext = {
      email: user.email,
      uuid: user.uuid,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
    };
    const userModel = await this.usersRepository.findOne({ uuid: user.uuid });
    userModel.lastLoggedIn = new Date();
    await this.em.flush();
    const clonedUser = { ...user };
    delete clonedUser.password;
    delete clonedUser.createdAt;
    delete clonedUser.updatedAt;
    return {
      status: true,
      data: {
        accessToken: this.jwtService.sign(payload),
        expiresIn: 1.2e6,
        refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
        user,
      },
    };
  }

  async loginWithGoogle(idToken: string) {
    const response = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
    );
    console.log('google data', response.data);
    const email = response.data?.email;
    if (!email) throw new BadRequestException(`Could not retrieve email`);
    let user = await this.usersRepository.findOne({ email });
    if (!user) {
      const userModel = this.usersRepository.create({
        email,
        emailVerified: true,
        lastLoggedIn: new Date(),
        uuid: v4(),
      });
      user = userModel;
      this.em.persist(userModel);
      await this.em.flush();
    }
    const payload: IAuthContext = {
      email: user.email,
      uuid: user.uuid,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
    };
    return {
      status: true,
      data: {
        accessToken: this.jwtService.sign(payload),
        expiresIn: 1.2e6,
        refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
        user,
      },
    };
  }

  async loginWithApple(idToken: string) {
    const client = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
    });
    const getKey = (
      header: jwt.JwtHeader,
      callback: jwt.SigningKeyCallback,
    ) => {
      client.getSigningKey(header.kid, (_err, key) => {
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
      });
    };
    const decoded: any = await new Promise((resolve, reject) => {
      jwt.verify(idToken, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });
    console.log('apple data', decoded);
    const email = decoded?.email;
    if (!email) throw new BadRequestException('Could not retrieve email');
    let user = await this.usersRepository.findOne({ email });
    if (!user) {
      const userModel = this.usersRepository.create({
        email,
        emailVerified: true,
        lastLoggedIn: new Date(),
        uuid: v4(),
      });
      user = userModel;
      this.em.persist(userModel);
      await this.em.flush();
    }
    const payload: IAuthContext = {
      email: user.email,
      uuid: user.uuid,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
    };
    return {
      status: true,
      data: {
        accessToken: this.jwtService.sign(payload),
        expiresIn: 1.2e6,
        refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
        user,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (err) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }
    const isBlacklisted = await this.blacklistedTokensRepository.findOne({
      token: refreshToken,
    });
    if (isBlacklisted)
      throw new ForbiddenException('Refresh token is blacklisted');
    const blacklistedToken = this.blacklistedTokensRepository.create({
      uuid: v4(),
      token: refreshToken,
    });
    this.em.persist(blacklistedToken);
    await this.em.flush();
    delete payload.exp;
    delete payload.iat;
    const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const newAccessToken = this.jwtService.sign(payload);
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 1.2e6,
    };
  }

  async verifyOtp({ otp, pinId, userUuid, otpActionType }: VerifyOtpDto) {
    const otpInDb = await this.otpRepository.findOne({ pinId });
    if (!otpInDb) throw new NotFoundException('Pin ID does not exist');
    if (otpInDb.otp !== otp) throw new UnauthorizedException('Invalid OTP');
    if (otpInDb.expiredAt !== null)
      throw new UnauthorizedException('OTP has expired');
    const diffMs = new Date().valueOf() - new Date(otpInDb.createdAt).valueOf();
    const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
    let otpModel = await this.otpRepository.findOne({ uuid: otpInDb.uuid });
    if (diffMins >= 10) {
      otpModel.expiredAt = new Date();
      await this.em.flush();
      throw new UnauthorizedException('OTP has expired');
    }
    let user: Users;
    switch (otpActionType) {
      case OTPActionType.VERIFY_PHONE:
        user = await this.usersRepository.findOne({ uuid: userUuid });
        user.phoneVerified = true;
        await this.em.flush();
        break;
      case OTPActionType.VERIFY_ACCOUNT:
        user = await this.usersRepository.findOne({ uuid: userUuid });
        user.emailVerified = true;
        return this.login(user);
        break;
      case OTPActionType.RESET_PASSWORD:
        const payload = { id: userUuid };
        return {
          status: true,
          data: this.jwtService.sign(payload, {
            expiresIn: 600,
            secret: this.jwtConfig.resetPwdSecretKey,
          }),
        };
      case OTPActionType.ADMIN_RESET_PASSWORD:
        return {
          status: true,
          data: this.jwtService.sign(
            { id: userUuid },
            { expiresIn: 600, secret: this.jwtConfig.adminResetPwdSecretKey },
          ),
        };
    }
    return { status: true };
  }

  async sendOtp({ userUuid, phone, otpActionType }: SendOtpDto) {
    const pinId = nanoid();
    const otp = generateOtp();
    const user = await this.usersRepository.findOne({ uuid: userUuid });
    if (!user) throw new NotFoundException('User does not exist');
    if (phone) {
      await this.sharedService.sendOtp(otp, phone, {} as any);
    } else {
      if (otpActionType === OTPActionType.VERIFY_ACCOUNT) {
        await this.sharedService.sendOtp(otp, null, {
          templateCode: 'verify_account',
          subject: 'Verify Email',
          data: {
            firstname: user.firstname,
            otp,
          },
          to: user.email,
        });
      } else {
        await this.sharedService.sendOtp(otp, null, {
          templateCode: 'reset_password',
          subject: 'Password Reset',
          data: {
            firstname: user.firstname,
            otp,
          },
          to: user.email,
        });
      }
    }
    const otpModel = this.otpRepository.create({ uuid: v4(), otp, pinId });
    this.em.persist(otpModel);
    await this.em.flush();
    return { status: true, data: pinId };
  }

  async initiateResetPassword({ email }: ResetPasswordDto) {
    const user = await this.usersRepository.findOne({ email });
    if (!user) throw new NotFoundException('User not found');
    const pinId = nanoid();
    const otp = generateOtp();
    await this.sharedService.sendOtp(otp, null, {
      templateCode: 'reset_password',
      subject: 'Password Reset',
      data: {
        firstname: user.firstname,
        otp,
      },
      to: user.email,
    });
    const otpModel = this.otpRepository.create({ uuid: v4(), otp, pinId });
    this.em.persist(otpModel);
    await this.em.flush();
    return { status: true, data: { pinId, userUuid: user.uuid } };
  }

  async changePassword(
    { oldPassword, newPassword }: ChangePasswordDto,
    { email }: IAuthContext,
  ) {
    const user = await this.usersRepository.findOne({ email });
    if (!user) throw new NotFoundException('User not found');
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch)
      throw new BadRequestException('Current password is incorrect');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await this.em.flush();
    return { status: true };
  }

  async resetPassword({ password }: NewResetPasswordDto, token: string) {
    let response: any;
    try {
      response = this.jwtService.verify(token, {
        secret: this.jwtConfig.resetPwdSecretKey,
      });
    } catch (error) {
      throw new UnauthorizedException(
        'Reset password token has expired. Kindly restart the process.',
      );
    }
    if (!response.id)
      throw new UnauthorizedException(
        'Kindly provide a valid access token to reset your password',
      );
    const { id } = response;
    const user = await this.usersRepository.findOne({ uuid: id });
    if (!user) throw new NotFoundException('User not found');
    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    await this.em.flush();
    return { status: true };
  }

  async logout({ accessToken, refreshToken }: LogoutDto) {
    let accessPayload: any;
    let refreshPayload: any;
    try {
      accessPayload = this.jwtService.verify(accessToken, {
        ignoreExpiration: true,
      });
      refreshPayload = this.jwtService.verify(refreshToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (accessPayload.uuid !== refreshPayload.uuid) {
      throw new UnauthorizedException('Token mismatch');
    }
    const user = await this.usersRepository.findOne({
      uuid: accessPayload.uuid,
    });
    if (!user) throw new NotFoundException('User not found');
    await this.em.transactional(async (em) => {
      user.deviceToken = null;
      const blacklistedRefreshToken = this.blacklistedTokensRepository.create({
        uuid: v4(),
        token: refreshToken,
      });
      const blacklistedAccessToken = this.blacklistedTokensRepository.create({
        uuid: v4(),
        token: accessToken,
      });
      em.persist(user);
      em.persist(blacklistedRefreshToken);
      em.persist(blacklistedAccessToken);
      await em.flush();
    });
    return { status: true };
  }
}
