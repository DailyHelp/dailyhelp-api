import crypto from 'crypto';

const VERSION = '006';

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const AGORA_PRIVILEGES = {
  JOIN_CHANNEL: 1,
  PUBLISH_AUDIO_STREAM: 2,
  PUBLISH_VIDEO_STREAM: 3,
  PUBLISH_DATA_STREAM: 4,
} as const;

export enum AgoraRtcRole {
  ATTENDEE = 0,
  PUBLISHER = 1,
  SUBSCRIBER = 2,
  ADMIN = 101,
}

export type BuildRtcTokenOptions = {
  appId: string;
  appCertificate: string;
  channelName: string;
  account: string | number;
  expireTimestamp: number;
  role?: AgoraRtcRole;
};

const packUint16 = (value: number) => {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
};

const packUint32 = (value: number) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
};

const packBytes = (input: Buffer) =>
  Buffer.concat([packUint16(input.length), input]);

const packMapUInt32 = (map: Record<number, number>) => {
  const keys = Object.keys(map)
    .map((key) => Number(key))
    .sort((a, b) => a - b);

  const parts: Buffer[] = [packUint16(keys.length)];
  keys.forEach((key) => {
    parts.push(packUint16(key));
    parts.push(packUint32(map[key]));
  });

  return Buffer.concat(parts);
};

const crc32 = (value: string) => {
  let crc = 0 ^ -1;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ code) & 0xff];
  }
  return (crc ^ -1) >>> 0;
};

const encodeHmac = (key: string, message: Buffer) =>
  crypto.createHmac('sha256', key).update(message).digest();

const normalizeAccount = (account: string | number) => {
  if (account === 0 || account === '0') return '';
  return String(account ?? '');
};

const randomSalt = () => crypto.randomBytes(4).readUInt32BE(0);

export const buildRtcToken = ({
  appId,
  appCertificate,
  channelName,
  account,
  role = AgoraRtcRole.PUBLISHER,
  expireTimestamp,
}: BuildRtcTokenOptions) => {
  const salt = randomSalt();
  const ts = Math.floor(Date.now() / 1000) + 24 * 3600;
  const uid = normalizeAccount(account);

  const privileges: Record<number, number> = {
    [AGORA_PRIVILEGES.JOIN_CHANNEL]: expireTimestamp,
  };

  if (
    role === AgoraRtcRole.ATTENDEE ||
    role === AgoraRtcRole.PUBLISHER ||
    role === AgoraRtcRole.ADMIN
  ) {
    privileges[AGORA_PRIVILEGES.PUBLISH_AUDIO_STREAM] = expireTimestamp;
    privileges[AGORA_PRIVILEGES.PUBLISH_VIDEO_STREAM] = expireTimestamp;
    privileges[AGORA_PRIVILEGES.PUBLISH_DATA_STREAM] = expireTimestamp;
  }

  const message = Buffer.concat([
    packUint32(salt),
    packUint32(ts),
    packMapUInt32(privileges),
  ]);

  const toSign = Buffer.concat([
    Buffer.from(appId, 'utf8'),
    Buffer.from(channelName, 'utf8'),
    Buffer.from(uid, 'utf8'),
    message,
  ]);

  const signature = encodeHmac(appCertificate, toSign);

  const content = Buffer.concat([
    packBytes(signature),
    packUint32(crc32(channelName)),
    packUint32(crc32(uid)),
    packBytes(message),
  ]);

  return `${VERSION}${appId}${content.toString('base64')}`;
};
