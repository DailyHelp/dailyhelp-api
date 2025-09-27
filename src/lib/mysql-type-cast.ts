import { Types, type FieldPacket } from 'mysql2';

/**
 * Coerce MySQL tinyint(1) columns containing 0/1 values into real booleans.
 * Falls back to the default driver behaviour for other numeric values so
 * non-boolean tinyints continue to behave as expected (e.g. rating scores).
 */
export const booleanTinyIntTypeCast = (
  field: FieldPacket,
  next: () => unknown,
): unknown => {
  const isTinyInt =
    field?.type === Types.TINY || field?.columnType === Types.TINY;
  const isBit = field?.type === Types.BIT || field?.columnType === Types.BIT;
  const columnLength = field?.columnLength ?? field?.length;
  const isSingleBit = typeof columnLength === 'number' && columnLength <= 1;

  if ((isTinyInt || isBit) && isSingleBit) {
    const stringAccessor = (field as unknown as {
      string?: () => string | null;
    }).string;

    if (typeof stringAccessor !== 'function') {
      return next();
    }

    const value = stringAccessor.call(field);

    if (value === null) {
      return null;
    }

    if (value === '0' || value === '1') {
      return value === '1';
    }

    return Number(value);
  }

  return next();
};
