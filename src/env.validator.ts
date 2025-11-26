import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  validateSync,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';

export enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Local = 'local',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;
  @IsString()
  DATABASE_HOST: string;
  @IsNumber()
  DATABASE_PORT: number;
  @IsString()
  DATABASE_PASSWORD: string;
  @IsString()
  DATABASE_NAME: string;
  @IsString()
  DATABASE_USER: string;
  @IsString()
  SENDGRID_API_KEY: string;
  @IsString()
  TERMII_BASE_URL: string;
  @IsString()
  TERMII_API_KEY: string;
  @IsString()
  API_BASE_URL: string;
  @IsString()
  PAYSTACK_SUCCESS_REDIRECT_PATH: string;
  @IsString()
  AGORA_APP_ID: string;
  @IsString()
  AGORA_APP_CERTIFICATE: string;
  @IsOptional()
  @IsNumber()
  AGORA_TOKEN_TTL_SECONDS?: number = 3600;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });
  if (errors.length) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
