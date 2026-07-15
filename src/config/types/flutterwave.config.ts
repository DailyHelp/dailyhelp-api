export interface FlutterwaveConfig {
  baseUrl: string;
  secretKey: string;
  publicKey: string;
  encryptionKey: string;
  secretHash: string;
  successRedirectUrl?: string;
}

export type PaymentGatewayName = 'paystack' | 'flutterwave';

export interface PaymentConfig {
  activeGateway: PaymentGatewayName;
}
