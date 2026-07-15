import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import {
  FlutterwaveConfiguration,
  PaymentConfiguration,
  PaystackConfiguration,
} from 'src/config/configuration';
import { PaymentGatewayName } from 'src/config/types/flutterwave.config';

export interface CheckoutInput {
  email: string;
  amountNaira: number;
  reference: string;
  metadata: Record<string, any>;
}

export interface CheckoutResult {
  authorizationUrl: string;
  accessCode: string;
}

/** Provider-agnostic view of a verified transaction. Amounts are in Naira. */
export interface NormalizedVerification {
  success: boolean;
  reference: string;
  transactionId: string;
  channel?: string;
  amountNaira: number;
  currency?: string;
  raw: any;
}

export type NormalizedWebhook =
  | { type: 'charge'; reference: string }
  | {
      type: 'transfer';
      reference: string;
      status: 'success' | 'failed';
      amountNaira: number;
    }
  | { type: 'ignored' };

export interface TransferBank {
  accountNumber: string;
  bankCode: string;
  accountName?: string;
  recipientCode?: string;
}

/**
 * Single entry point for every external payment-provider call. Keeps both
 * Paystack and Flutterwave implementations behind one interface and dispatches
 * on the configured active gateway (defaults to Flutterwave). Webhook handling
 * stays provider-explicit because a webhook can arrive from either provider
 * regardless of which one is currently active.
 */
@Injectable()
export class PaymentGatewayService {
  constructor(
    @Inject(PaystackConfiguration.KEY)
    private readonly paystackConfig: ConfigType<typeof PaystackConfiguration>,
    @Inject(FlutterwaveConfiguration.KEY)
    private readonly flutterwaveConfig: ConfigType<
      typeof FlutterwaveConfiguration
    >,
    @Inject(PaymentConfiguration.KEY)
    private readonly paymentConfig: ConfigType<typeof PaymentConfiguration>,
  ) {}

  get activeGateway(): PaymentGatewayName {
    return this.paymentConfig.activeGateway === 'paystack'
      ? 'paystack'
      : 'flutterwave';
  }

  private get paystackHeaders() {
    return { Authorization: `Bearer ${this.paystackConfig.secretKey}` };
  }

  private get flutterwaveHeaders() {
    return { Authorization: `Bearer ${this.flutterwaveConfig.secretKey}` };
  }

  // ---------------------------------------------------------------------------
  // Checkout initialization (dispatches on active gateway)
  // ---------------------------------------------------------------------------

  async initializeCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    return this.activeGateway === 'paystack'
      ? this.initPaystackCheckout(input)
      : this.initFlutterwaveCheckout(input);
  }

  private async initPaystackCheckout({
    email,
    amountNaira,
    reference,
    metadata,
  }: CheckoutInput): Promise<CheckoutResult> {
    const payload: Record<string, any> = {
      email,
      amount: Math.round(amountNaira * 100),
      currency: 'NGN',
      reference,
      metadata,
    };
    if (this.paystackConfig.successRedirectUrl) {
      payload.callback_url = this.paystackConfig.successRedirectUrl;
    }
    const res = await axios.post(
      `${this.paystackConfig.baseUrl}/transaction/initialize`,
      payload,
      { headers: this.paystackHeaders },
    );
    const { authorization_url, access_code } = res.data.data;
    return { authorizationUrl: authorization_url, accessCode: access_code };
  }

  private async initFlutterwaveCheckout({
    email,
    amountNaira,
    reference,
    metadata,
  }: CheckoutInput): Promise<CheckoutResult> {
    // Flutterwave `meta` only accepts scalar values; drop nulls/undefineds.
    const meta = Object.fromEntries(
      Object.entries(metadata).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );
    const res = await axios.post(
      `${this.flutterwaveConfig.baseUrl}/payments`,
      {
        tx_ref: reference,
        amount: amountNaira,
        currency: 'NGN',
        redirect_url: this.flutterwaveConfig.successRedirectUrl,
        customer: { email },
        meta,
        customizations: { title: 'DailyHelp' },
      },
      { headers: this.flutterwaveHeaders },
    );
    if (res.data?.status !== 'success' || !res.data?.data?.link) {
      throw new InternalServerErrorException(
        res.data?.message || 'Unable to initialize payment',
      );
    }
    return { authorizationUrl: res.data.data.link, accessCode: reference };
  }

  // ---------------------------------------------------------------------------
  // Transaction verification (provider-explicit; used by webhook handlers)
  // ---------------------------------------------------------------------------

  async verifyWithPaystack(reference: string): Promise<NormalizedVerification> {
    const res = await axios.get(
      `${this.paystackConfig.baseUrl}/transaction/verify/${encodeURIComponent(
        reference,
      )}`,
      { headers: this.paystackHeaders },
    );
    const d = res.data.data;
    return {
      success: d?.status?.toLowerCase() === 'success',
      reference: d?.reference,
      transactionId: String(d?.id),
      channel: d?.channel ?? d?.payment_method,
      amountNaira: Number(d?.amount) / 100,
      currency: d?.currency,
      raw: d,
    };
  }

  async verifyWithFlutterwave(
    reference: string,
  ): Promise<NormalizedVerification> {
    const res = await axios.get(
      `${
        this.flutterwaveConfig.baseUrl
      }/transactions/verify_by_reference?tx_ref=${encodeURIComponent(
        reference,
      )}`,
      { headers: this.flutterwaveHeaders },
    );
    const d = res.data.data;
    return {
      success:
        d?.status?.toLowerCase() === 'successful' && d?.currency === 'NGN',
      reference: d?.tx_ref,
      transactionId: String(d?.id),
      channel: d?.payment_type,
      amountNaira: Number(d?.amount),
      currency: d?.currency,
      raw: d,
    };
  }

  // ---------------------------------------------------------------------------
  // Webhook signature verification + event parsing (provider-explicit)
  // ---------------------------------------------------------------------------

  verifyPaystackSignature(req: Request): boolean {
    if (!this.paystackConfig.secretKey) return false;
    const hash = crypto
      .createHmac('sha512', this.paystackConfig.secretKey)
      .update(JSON.stringify(req.body))
      .digest('hex');
    return hash === req.headers['x-paystack-signature'];
  }

  verifyFlutterwaveSignature(req: Request): boolean {
    const signature = req.headers['verif-hash'];
    return (
      !!this.flutterwaveConfig.secretHash &&
      signature === this.flutterwaveConfig.secretHash
    );
  }

  parsePaystackWebhook(body: any): NormalizedWebhook {
    const event = body?.event;
    const data = body?.data ?? {};
    if (event === 'charge.success') {
      return { type: 'charge', reference: data.reference };
    }
    if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event)) {
      return {
        type: 'transfer',
        reference: data.reference,
        status: data.status === 'success' ? 'success' : 'failed',
        amountNaira: Number(data.amount) / 100,
      };
    }
    return { type: 'ignored' };
  }

  parseFlutterwaveWebhook(body: any): NormalizedWebhook {
    const event = body?.event ?? body?.['event.type'];
    const data = body?.data ?? {};
    if (event === 'charge.completed') {
      return { type: 'charge', reference: data.tx_ref };
    }
    if (event === 'transfer.completed') {
      return {
        type: 'transfer',
        reference: data.reference,
        status:
          String(data.status).toUpperCase() === 'SUCCESSFUL'
            ? 'success'
            : 'failed',
        amountNaira: Number(data.amount),
      };
    }
    return { type: 'ignored' };
  }

  // ---------------------------------------------------------------------------
  // Payouts / transfers (dispatches on active gateway)
  // ---------------------------------------------------------------------------

  async createTransfer(params: {
    amountNaira: number;
    reference: string;
    bank: TransferBank;
  }): Promise<{ pending: boolean; raw: any }> {
    return this.activeGateway === 'paystack'
      ? this.createPaystackTransfer(params)
      : this.createFlutterwaveTransfer(params);
  }

  private async createPaystackTransfer({
    amountNaira,
    reference,
    bank,
  }: {
    amountNaira: number;
    reference: string;
    bank: TransferBank;
  }) {
    const res = await axios.post(
      `${this.paystackConfig.baseUrl}/transfer`,
      {
        source: 'balance',
        amount: Math.round(amountNaira * 100),
        recipient: bank.recipientCode,
        reference,
        reason: 'Payout',
      },
      { headers: this.paystackHeaders },
    );
    const status = res.data.data.status;
    if (status !== 'disabled') {
      throw new InternalServerErrorException(
        `Kindly contact admin to ensure that OTP is disabled for transfers on this account`,
      );
    }
    return { pending: true, raw: res.data.data };
  }

  private async createFlutterwaveTransfer({
    amountNaira,
    reference,
    bank,
  }: {
    amountNaira: number;
    reference: string;
    bank: TransferBank;
  }) {
    const res = await axios.post(
      `${this.flutterwaveConfig.baseUrl}/transfers`,
      {
        account_bank: bank.bankCode,
        account_number: bank.accountNumber,
        amount: amountNaira,
        narration: 'Payout',
        currency: 'NGN',
        debit_currency: 'NGN',
        reference,
      },
      { headers: this.flutterwaveHeaders },
    );
    if (res.data?.status !== 'success') {
      throw new InternalServerErrorException(
        res.data?.message || 'Unable to initiate payout',
      );
    }
    return { pending: true, raw: res.data.data };
  }

  /**
   * Paystack needs a transfer recipient created up front; Flutterwave transfers
   * take the raw account details, so no recipient code is required.
   */
  async createRecipient(bank: {
    accountName: string;
    accountNumber: string;
    bankCode: string;
  }): Promise<string | undefined> {
    if (this.activeGateway !== 'paystack') return undefined;
    const res = await axios.post(
      `${this.paystackConfig.baseUrl}/transferrecipient`,
      {
        type: 'nuban',
        name: bank.accountName,
        account_number: bank.accountNumber,
        bank_code: bank.bankCode,
        currency: 'NGN',
      },
      { headers: this.paystackHeaders },
    );
    return res.data.data.recipient_code;
  }

  // ---------------------------------------------------------------------------
  // Bank helpers (dispatches on active gateway)
  // ---------------------------------------------------------------------------

  async resolveAccount({
    accountNumber,
    bankCode,
  }: {
    accountNumber: string;
    bankCode: string;
  }): Promise<any> {
    if (this.activeGateway === 'paystack') {
      const res = await axios.get(
        `${this.paystackConfig.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: this.paystackHeaders },
      );
      return res.data;
    }
    const res = await axios.post(
      `${this.flutterwaveConfig.baseUrl}/accounts/resolve`,
      { account_number: accountNumber, account_bank: bankCode },
      { headers: this.flutterwaveHeaders },
    );
    return res.data;
  }

  async listBanks(): Promise<{ name: string; code: string }[]> {
    if (this.activeGateway === 'paystack') {
      const res = await axios.get(`${this.paystackConfig.baseUrl}/bank`, {
        headers: this.paystackHeaders,
      });
      return (res.data?.data ?? []).map((b: any) => ({
        name: b.name,
        code: b.code,
      }));
    }
    const res = await axios.get(
      `${this.flutterwaveConfig.baseUrl}/banks/NG`,
      { headers: this.flutterwaveHeaders },
    );
    return (res.data?.data ?? []).map((b: any) => ({
      name: b.name,
      code: b.code,
    }));
  }
}
