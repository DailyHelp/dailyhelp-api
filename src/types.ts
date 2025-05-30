export enum OTPActionType {
  VERIFY_ACCOUNT = 'VERIFY_ACCOUNT',
  RESET_PASSWORD = 'RESET_PASSWORD',
  ADMIN_RESET_PASSWORD = 'ADMIN_RESET_PASSWORD',
  VERIFY_PHONE = 'VERIFY_PHONE',
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
