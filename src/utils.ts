import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import otpGenerator from 'otp-generator';
import { BasePaginatedResponseDto } from './base/dto';
import { JobStatus, UserJobStatus } from './types';

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

type ExtraSafe<E> = Omit<E, 'status' | 'data' | 'pagination'>;

export const buildResponseDataWithPagination = <T, E extends object = {}>(
  data: T[] | any,
  total: number,
  pagination: { limit: number; page: number },
  extra?: ExtraSafe<E>,
): BasePaginatedResponseDto & E => {
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
    ...(extra as E),
  };
};

export const appendCondition = (
  sql: string,
  params: any[],
  value?: string | number | boolean,
) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value === 'string' && value.includes(',')) {
    const values = value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v !== '');
    if (values.length === 0) return '';

    params.push(...values);
    const placeholders = values.map(() => '?').join(', ');
    return `${sql} IN (${placeholders})`;
  }

  params.push(value);
  return `${sql} = ?`;
};

export const buildFullName = (
  ...parts: Array<string | null | undefined>
): string | null => {
  const cleaned = parts
    .map((part) => (typeof part === 'string' ? part.trim() : part))
    .filter((part): part is string => Boolean(part && part.length));
  return cleaned.length ? cleaned.join(' ') : null;
};

export const mapJobStatusToUserJobStatus = (
  status?: JobStatus | null,
): UserJobStatus | null => {
  switch (status) {
    case JobStatus.PENDING:
      return 'accepted';
    case JobStatus.IN_PROGRESS:
    case JobStatus.DISPUTED:
      return 'in_progress';
    case JobStatus.COMPLETED:
      return 'completed';
    default:
      return null;
  }
};

const URL_REGEX =
  /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|io|co|me|app|dev|gg|xyz|info|biz|tv|us|uk|ng|africa|edu|gov|ai|in|cn|de|fr|es|it|jp|kr|br|ru|au|ca|nz|to|ly|sh|live|online|site|store|tech|click|link|chat|so)(?:\/[^\s<>"']*)?\b/gi;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const HANDLE_REGEX = /(^|\s)(@[A-Za-z0-9_]{3,})\b/g;
const PHONE_BLOCK_REGEX = /[+(]?\d[\d\s().\-]{5,}\d/g;
const DIGIT_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'oh',
  'nought',
  'naught',
  'double',
  'triple',
];
const DIGIT_WORD_ALT = DIGIT_WORDS.join('|');
const DIGIT_WORD_SEQUENCE_REGEX = new RegExp(
  `\\b(?:${DIGIT_WORD_ALT})(?:[\\s,.\\-]+(?:and[\\s,.\\-]+)?(?:${DIGIT_WORD_ALT})){4,}\\b`,
  'gi',
);
const DIGIT_WORD_TOKEN_REGEX = new RegExp(`\\b(?:${DIGIT_WORD_ALT})\\b`, 'gi');

export const sanitizeChatMessage = (input: string): string => {
  if (!input) return input;
  let output = input;

  output = output.replace(EMAIL_REGEX, (m) => '*'.repeat(m.length));
  output = output.replace(URL_REGEX, (m) => '*'.repeat(m.length));
  output = output.replace(
    HANDLE_REGEX,
    (_m, lead: string, handle: string) => lead + '*'.repeat(handle.length),
  );

  output = output.replace(PHONE_BLOCK_REGEX, (block) => {
    const digitCount = (block.match(/\d/g) || []).length;
    if (digitCount < 7) return block;
    return block.replace(/\d/g, '*');
  });

  output = output.replace(DIGIT_WORD_SEQUENCE_REGEX, (run) =>
    run.replace(DIGIT_WORD_TOKEN_REGEX, '*'),
  );

  return output;
};
