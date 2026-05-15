import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { SmtpConfiguration } from 'src/config/configuration';
import { ContactDto } from './contact.dto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require('nodemailer') as {
  createTransport: (opts: any) => {
    sendMail: (mail: any) => Promise<any>;
  };
};

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(SmtpConfiguration.KEY)
    private readonly smtpConfig: ConfigType<typeof SmtpConfiguration>,
  ) {}

  async sendContactEmail(dto: ContactDto): Promise<void> {
    const contactEmail = process.env.CONTACT_EMAIL;
    if (!contactEmail) {
      this.logger.error('CONTACT_EMAIL env variable is not set');
      throw new InternalServerErrorException(
        'Contact email recipient is not configured',
      );
    }

    if (!this.smtpConfig.host || !this.smtpConfig.username) {
      throw new InternalServerErrorException('SMTP is not configured');
    }

    const transporter = nodemailer.createTransport({
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      secure: [465, 2465].includes(this.smtpConfig.port),
      auth: {
        user: this.smtpConfig.username,
        pass: this.smtpConfig.password,
      },
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #017441;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #757C91; width: 120px;">Name:</td>
            <td style="padding: 8px 0; color: #121921;">${this.escapeHtml(dto.fullName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #757C91;">Email:</td>
            <td style="padding: 8px 0; color: #121921;">
              <a href="mailto:${this.escapeHtml(dto.email)}" style="color: #017441;">${this.escapeHtml(dto.email)}</a>
            </td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #F1F2F4; margin: 16px 0;" />
        <p style="font-weight: bold; color: #757C91; margin-bottom: 8px;">Message:</p>
        <p style="color: #121921; white-space: pre-line;">${this.escapeHtml(dto.message)}</p>
        <hr style="border: none; border-top: 1px solid #F1F2F4; margin: 16px 0;" />
        <p style="font-size: 12px; color: #A9AFC2;">
          This message was submitted via the DailyHelp contact form.
          Reply directly to this email to respond to ${this.escapeHtml(dto.fullName)}.
        </p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: this.smtpConfig.from || 'DailyHelp <no-reply@dailyhelpint.org>',
        to: contactEmail,
        replyTo: `"${dto.fullName}" <${dto.email}>`,
        subject: `Contact Form: Message from ${dto.fullName}`,
        html,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to send contact form email: ${error?.message ?? 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Failed to send your message. Please try again later.',
      );
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
