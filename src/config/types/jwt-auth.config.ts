export interface JwtAuthConfig {
    secretKey: string;
    adminSecretKey: string;
    resetPwdSecretKey: string;
    adminResetPwdSecretKey: string;
}