export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  defaultBcc?: string;
}
