import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  QoreIDConfiguration,
  SendgridConfiguration,
  TermiiConfiguration,
} from 'src/config/configuration';
import { NotificationTemplates } from 'src/entities/notification-templates.entity';
import phone from 'phone';
import { IEmailDto } from 'src/types';
import { replacer } from 'src/utils';
import axios from 'axios';

type MailAddress = {
  email: string;
  name?: string;
};

@Injectable()
export class SharedService {
  private readonly logger: Logger = new Logger(SharedService.name);
  private readonly sendgridEndpoint = 'https://api.sendgrid.com/v3/mail/send';
  private readonly defaultFrom = 'DailyHelp <no-reply@fonu.com>';

  constructor(
    @InjectRepository(NotificationTemplates)
    private readonly notificationTemplatesRepository: EntityRepository<NotificationTemplates>,
    @Inject(SendgridConfiguration.KEY)
    private readonly sendgridConfig: ConfigType<typeof SendgridConfiguration>,
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

  private parseAddress(address?: string): MailAddress | null {
    if (!address) return null;
    const trimmed = address.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(.*)<(.+)>$/);
    if (match) {
      const name = match[1]?.trim().replace(/^"(.*)"$/, '$1');
      const email = match[2]?.trim();
      if (!email) return null;
      return name ? { email, name } : { email };
    }
    return { email: trimmed };
  }

  private parseAddressList(addresses?: string): MailAddress[] {
    if (!addresses) return [];
    return addresses
      .split(',')
      .map((entry) => this.parseAddress(entry))
      .filter(
        (addr): addr is MailAddress => Boolean(addr?.email),
      );
  }

  async sendEmail(email: IEmailDto) {
    if (!this.sendgridConfig.apiKey) {
      throw new InternalServerErrorException('SendGrid is not configured');
    }
    const notificationTemplate =
      await this.notificationTemplatesRepository.findOne({
        code: email.templateCode,
      });
    if (!notificationTemplate)
      throw new NotFoundException(
        `Notification template: ${email.templateCode} does not exist`,
      );
    const html = email.data
      ? replacer(0, Object.entries(email.data), notificationTemplate.body)
      : notificationTemplate.body;
    const fromAddress =
      this.parseAddress(email.from ?? this.sendgridConfig.defaultFrom) ??
      this.parseAddress(this.defaultFrom);
    if (!fromAddress) {
      throw new InternalServerErrorException('Default sender email is not set');
    }
    if (!email.to) {
      throw new BadRequestException('Recipient email is required');
    }
    const toAddress = this.parseAddress(email.to);
    if (!toAddress) {
      throw new BadRequestException('Recipient email is invalid');
    }
    const bccAddresses = this.parseAddressList(
      email.bcc ?? this.sendgridConfig.defaultBcc ?? 'admin@dailyhelp.ng',
    );
    const payload: Record<string, any> = {
      personalizations: [
        {
          to: [toAddress],
          ...(bccAddresses.length ? { bcc: bccAddresses } : {}),
        },
      ],
      from: fromAddress,
      subject: email.subject,
      content: [
        {
          type: 'text/html',
          value: html,
        },
      ],
    };
    try {
      await axios.post(this.sendgridEndpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.sendgridConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      const err = error as any;
      const responseDetails =
        err?.response?.data || err?.message || 'Unknown error';
      this.logger.error(
        `Error sending email via SendGrid: ${
          typeof responseDetails === 'string'
            ? responseDetails
            : JSON.stringify(responseDetails)
        }`,
      );
      throw new InternalServerErrorException('Unable to send email');
    }
  }

  async sendOtp(
    otp: string,
    phone: string,
    { templateCode, subject, data, to }: IEmailDto,
  ) {
    if (phone) {
      let smsOtpResponse: any;
      try {
        smsOtpResponse = await axios.post(
          `${this.termiiConfig.baseUrl}/api/sms/send`,
          {
            to: phone,
            from: 'DailyHelp',
            sms: `Your DailyHelp verification code is ${otp}. Valid for 10 mins, one-time use only.`,
            type: 'plain',
            channel: 'generic',
            api_key: this.termiiConfig.apiKey,
          },
        );
      } catch (error) {
        this.logger.error(
          `Error occurred while sending SMS OTP to: ${phone}. Error: ${error}`,
        );
        throw error;
      }
      if (smsOtpResponse.data.code !== 'ok') {
        throw new InternalServerErrorException(smsOtpResponse.data.message);
      }
    }
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
