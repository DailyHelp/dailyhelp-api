import { registerAs } from '@nestjs/config';
import { SmtpConfig } from './types/smtp.config';
import { TermiiConfig } from './types/termii.config';
import { JwtAuthConfig } from './types/jwt-auth.config';
import { QoreIDConfig } from './types/qoreid.config';
import { PaystackConfig } from './types/paystack.config';
import { FirebaseAdminConfig } from './types/firebase.config';

export const SmtpConfiguration = registerAs(
  'smtpConfig',
  (): SmtpConfig => ({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    username: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
  }),
);

export const TermiiConfiguration = registerAs(
  'termiiConfig',
  (): TermiiConfig => ({
    baseUrl: process.env.TERMII_BASE_URL,
    apiKey: process.env.TERMII_API_KEY,
  }),
);

export const JwtAuthConfiguration = registerAs(
  'jwtAuthConfig',
  (): JwtAuthConfig => ({
    secretKey: process.env.JWT_SECRET_KEY || 'secret',
    adminSecretKey: process.env.ADMIN_JWT_SECRET_KEY || 'admin-secret',
    resetPwdSecretKey:
      process.env.RESET_PWD_JWT_SECRET_KEY || 'reset-pwd-secret',
    adminResetPwdSecretKey:
      process.env.ADMIN_RESET_PWD_JWT_SECRET_KEY || 'admin-reset-pwd-secret',
  }),
);

export const QoreIDConfiguration = registerAs(
  'qoreidConfig',
  (): QoreIDConfig => ({
    clientId: process.env.QOREID_CLIENT_ID,
    secretKey: process.env.QOREID_SECRET_KEY,
    baseUrl: process.env.QOREID_BASE_URL,
  }),
);

export const PaystackConfiguration = registerAs(
  'paystackConfig',
  (): PaystackConfig => ({
    baseUrl: process.env.PAYSTACK_BASE_URL,
    secretKey: process.env.PAYSTACK_SECRET_KEY,
  }),
);

export const FirebaseConfiguration = registerAs(
  'firebaseConfig',
  (): FirebaseAdminConfig => ({
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    databaseUrl: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  }),
);
