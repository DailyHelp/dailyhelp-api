import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import otpGenerator from 'otp-generator';
import { BasePaginatedResponseDto } from './base/dto';

export const replacer = (i: number, arr: any, str: string) => {
  const len = arr.length;
  if (i < len) {
    const [key, value] = arr[i];
    const formattedKey = `{{${key}}}`;
    return replacer(i + 1, arr, str.split(formattedKey).join(value));
  } else {
    return str;
  }
};

export const generateOtp = (length?: number) =>
  otpGenerator.generate(length ?? 6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

export const extractTokenFromReq = (req: Request, error: string) => {
  const authorizationHeader = req.headers['authorization'];
  if (!authorizationHeader) throw new UnauthorizedException(error);
  const token = authorizationHeader.split(' ')[1];
  if (!token) throw new UnauthorizedException(error);
  return token;
};

export const buildResponseDataWithPagination = <T>(
  data: T[] | any,
  total: number,
  pagination: { limit: number; page: number },
): BasePaginatedResponseDto => {
  return {
    status: true,
    data,
    pagination: {
      limit: Number(pagination.limit),
      page: Number(pagination.page),
      total,
      size: data.length,
      pages:
        Number(Math.ceil(total / pagination.limit).toFixed()) ||
        (total && 1) ||
        0,
    },
  };
};

export const appendCondition = (sql: string, params: any[], value?: any) => {
  if (value !== undefined && value !== null && value !== '') {
    params.push(value);
    return `${sql} ?`;
  }
  return '';
};
