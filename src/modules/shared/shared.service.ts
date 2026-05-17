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
  SmtpConfiguration,
  TermiiConfiguration,
} from 'src/config/configuration';
import { NotificationTemplates } from 'src/entities/notification-templates.entity';
import phone from 'phone';
import { IEmailDto } from 'src/types';
import { replacer } from 'src/utils';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require('nodemailer') as {
  createTransport: (opts: any) => {
    sendMail: (mail: any) => Promise<any>;
  };
};

type MailAddress = {
  email: string;
  name?: string;
};

@Injectable()
export class SharedService {
  private readonly logger: Logger = new Logger(SharedService.name);
  private readonly defaultFrom = 'DailyHelp <no-reply@dailyhelpint.org>';

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

  private getTermiiSmsUrl(): string {
    const baseUrl = this.termiiConfig.baseUrl?.trim();
    if (!baseUrl) {
      throw new InternalServerErrorException('Termii is not configured');
    }

    const normalizedBaseUrl = baseUrl
      .replace(/\/+$/, '')
      .replace(/\/api\/sms\/send$/, '')
      .replace(/\/api$/, '');

    return `${normalizedBaseUrl}/api/sms/send`;
  }

  private formatTermiiPhoneNumber(phoneNo: string): string {
    return this.validatePhoneNumber(phoneNo).replace(/^\+/, '');
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

  private formatAddress(addr: MailAddress): string {
    return addr.name ? `"${addr.name}" <${addr.email}>` : addr.email;
  }

  async sendEmail(email: IEmailDto) {
    if (!this.smtpConfig.host || !this.smtpConfig.username) {
      throw new InternalServerErrorException('SMTP is not configured');
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
      this.parseAddress(email.from ?? this.smtpConfig.from) ??
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
      email.bcc ?? this.smtpConfig.defaultBcc ?? 'admin@dailyhelp.ng',
    );

    const transporter = nodemailer.createTransport({
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      secure: [465, 2465].includes(this.smtpConfig.port),
      auth: {
        user: this.smtpConfig.username,
        pass: this.smtpConfig.password,
      },
    });

    try {
      await transporter.sendMail({
        from: this.formatAddress(fromAddress),
        to: this.formatAddress(toAddress),
        ...(bccAddresses.length
          ? { bcc: bccAddresses.map(this.formatAddress).join(', ') }
          : {}),
        subject: email.subject,
        html,
      });
    } catch (error) {
      const err = error as any;
      this.logger.error(
        `Error sending email via SMTP: ${err?.message ?? 'Unknown error'}`,
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
      const smsUrl = this.getTermiiSmsUrl();
      const recipient = this.formatTermiiPhoneNumber(phone);
      try {
        smsOtpResponse = await axios.post(smsUrl, {
          to: recipient,
          from: this.termiiConfig.senderId,
          sms: `Your DailyHelp verification code is ${otp}. Valid for 10 mins, one-time use only.`,
          type: 'plain',
          channel: this.termiiConfig.smsChannel,
          api_key: this.termiiConfig.apiKey,
        });
      } catch (error) {
        const err = error as any;
        const status = axios.isAxiosError(err)
          ? err.response?.status
          : undefined;
        const responseData = axios.isAxiosError(err)
          ? JSON.stringify(err.response?.data)
          : undefined;
        this.logger.error(
          `Error occurred while sending SMS OTP to: ${recipient}. URL: ${smsUrl}. Status: ${status ?? 'n/a'}. Response: ${responseData ?? err?.message ?? 'Unknown error'}`,
        );
        throw new InternalServerErrorException('Unable to send SMS OTP');
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
