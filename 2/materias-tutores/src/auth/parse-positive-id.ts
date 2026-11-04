const MAX_BIGINT_POSTGRES = 9223372036854775807n;

export function parsePositiveId(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value)) {
    return null;
  }

  const id = BigInt(value);
  return id <= MAX_BIGINT_POSTGRES ? id : null;
}
