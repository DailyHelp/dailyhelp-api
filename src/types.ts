export enum OTPActionType {
  VERIFY_ACCOUNT = 'VERIFY_ACCOUNT',
  RESET_PASSWORD = 'RESET_PASSWORD',
  ADMIN_RESET_PASSWORD = 'ADMIN_RESET_PASSWORD',
  VERIFY_PHONE = 'VERIFY_PHONE',
}

export enum AccountTier {
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  CANCELED = 'CANCELED',
}

export enum PaymentPurpose {
  JOB_OFFER = 'JOB_OFFER',
  FUND_WALLET = 'FUND_WALLET',
}

export enum DisputeStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export enum ReasonCategoryType {
  JOB_PROVIDER = 'JOB_PROVIDER',
  OFFER_PROVIDER = 'OFFER_PROVIDER',
  DISPUTE_PROVIDER = 'DISPUTE_PROVIDER',
  REPORT_PROVIDER = 'REPORT_PROVIDER',
  ACCOUNT_DELETION_PROVIDER = 'ACCOUNT_DELETION_PROVIDER',
  JOB_CLIENT = 'JOB_CLIENT',
  OFFER_CLIENT = 'OFFER_CLIENT',
  DISPUTE_CLIENT = 'DISPUTE_CLIENT',
  REPORT_CLIENT = 'REPORT_CLIENT',
  ACCOUNT_DELETION_CLIENT = 'ACCOUNT_DELETION_CLIENT',
}

export enum MessageType {
  TEXT = 'TEXT',
  OFFER = 'OFFER',
  OFFER_WITH_TEXT = 'OFFER_WITH_TEXT',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  SEEN = 'SEEN',
}

export enum OfferStatus {
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  COUNTERED = 'COUNTERED',
}

export enum PaymentType {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum Currencies {
  NGN = 'NGN',
}

export enum OrderDir {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum UserType {
  PROVIDER = 'PROVIDER',
  CUSTOMER = 'CUSTOMER',
}

export interface IEmailDto {
  templateCode: string;
  to?: string;
  subject: string;
  from?: string;
  bcc?: string;
  html?: string;
  data?: any;
}

export interface IAuthContext {
  email: string;
  uuid: string;
  firstname: string;
  lastname: string;
  phone: string;
  userType: UserType;
}

export interface IAdminAuthContext {
  name: string;
  email: string;
  uuid: string;
}

export interface IProviderOnboarding {
  step1: boolean;
  step2: boolean;
  step3: boolean;
}
