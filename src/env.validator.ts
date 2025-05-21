import { IsEnum, IsString, IsNumber, validateSync } from 'class-validator';
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
  SMTP_HOST: string;
  @IsNumber()
  SMTP_PORT: number;
  @IsString()
  SMTP_USERNAME: string;
  @IsString()
  SMTP_PASSWORD: string;
  @IsString()
  SMTP_FROM: string;
  @IsString()
  TERMII_BASE_URL: string;
  @IsString()
  TERMII_API_KEY: string;
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
