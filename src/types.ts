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
  CANCELED = 'CANCELED',
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
  JOB_CLIENT = 'JOB_CLIENT',
  OFFER_CLIENT = 'OFFER_CLIENT',
  DISPUTE_CLIENT = 'DISPUTE_CLIENT',
  REPORT_CLIENT = 'REPORT_CLIENT',
}

export enum MessageType {
  TEXT = 'TEXT',
  OFFER = 'OFFER',
}

export enum OfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  COUNTERED = 'COUNTERED',
}

export enum OrderDir {
  ASC = 'ASC',
  DESC = 'DESC',
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
}

export interface IAdminAuthContext {
  name: string;
  email: string;
  uuid: string;
}
