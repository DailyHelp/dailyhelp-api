import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  QoreIDConfiguration,
  SmtpConfiguration,
  TermiiConfiguration,
} from 'src/config/configuration';
import { NotificationTemplates } from 'src/entities/notification-templates.entity';
import phone from 'phone';
import mailer from 'nodemailer-promise';
import { IEmailDto } from 'src/types';
import { replacer } from 'src/utils';
import axios from 'axios';

@Injectable()
export class SharedService {
  private readonly logger: Logger = new Logger(SharedService.name);

  constructor(
    @InjectRepository(NotificationTemplates)
    private readonly notificationTemplatesRepository: EntityRepository<NotificationTemplates>,
    @Inject(SmtpConfiguration.KEY)
    private readonly smtpConfig: ConfigType<typeof SmtpConfiguration>,
    @Inject(TermiiConfiguration.KEY)
    private readonly termiiConfig: ConfigType<typeof TermiiConfiguration>,
    @Inject(QoreIDConfiguration.KEY)
    private readonly qoreidConfig: ConfigType<typeof QoreIDConfiguration>,
  ) {}

  validatePhoneNumber(phoneNo: string) {
    const { isValid, phoneNumber } = phone(phoneNo, { country: 'NG' });
    if (!isValid)
      throw new BadRequestException(
        'Phone number must be a valid nigeria phone number',
      );
    return phoneNumber;
  }

  async sendEmail(email: IEmailDto) {
    const sendMail = mailer.config({
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      secure: true,
      from: 'DailyHelp <no-reply@dailyhelp.ng>',
      auth: {
        user: this.smtpConfig.username,
        pass: this.smtpConfig.password,
      },
    });
    const notificationTemplate =
      await this.notificationTemplatesRepository.findOne({
        code: email.templateCode,
      });
    if (!notificationTemplate)
      throw new NotFoundException(
        `Notification template: ${email.templateCode} does not exist`,
      );
    email.html = email.data
      ? replacer(0, Object.entries(email.data), notificationTemplate.body)
      : notificationTemplate.body;
    delete email.templateCode;
    if (!email.bcc) email.bcc = 'admin@dailyhelp.ng';
    if (!email.from) email.from = 'DailyHelp <no-reply@dailyhelp.ng>';
    sendMail(email);
  }

  async sendOtp(
    otp: string,
    phone: string,
    { templateCode, subject, data, to }: IEmailDto,
  ) {
    if (to) {
      await this.sendEmail({ templateCode, to, subject, data });
    }
    return otp;
  }

  async getQoreIDToken() {
    const response = await axios.post(`${this.qoreidConfig.baseUrl}/token`, {
      clientId: this.qoreidConfig.clientId,
      secret: this.qoreidConfig.secretKey,
    });
    const accessToken = response?.data?.accessToken;
    return accessToken;
  }
}
