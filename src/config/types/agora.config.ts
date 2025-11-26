export interface AgoraConfig {
  appId: string;
  appCertificate: string;
  /**
   * Lifetime of generated RTC tokens in seconds.
   * Defaults to 1 hour when not provided.
   */
  tokenTtlSeconds?: number;
}
