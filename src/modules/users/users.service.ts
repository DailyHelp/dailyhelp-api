import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Users } from './users.entity';
import { SharedService } from '../shared/shared.service';
import { VerifyIdentityDto } from './users.dto';
import { IAuthContext } from 'src/types';
import axios, { AxiosResponse } from 'axios';
import { QoreIDConfiguration } from 'src/config/configuration';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Users)
    private readonly usersRepository: EntityRepository<Users>,
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
      return this.usersRepository.findOne({
        $or: [{ email: username }, { phone: username }],
      });
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
  }
}
