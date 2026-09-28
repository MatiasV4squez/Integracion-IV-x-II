function required(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Falta la variable de entorno ${key}.`);
  }
  return value.trim();
}

function integerInRange(
  value: unknown,
  key: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value ?? defaultValue);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${key} debe ser un entero entre ${minimum} y ${maximum}.`);
  }
  return parsed;
}

function booleanValue(
  value: unknown,
  key: string,
  defaultValue: boolean,
): boolean {
  const candidate = value ?? defaultValue;
  if (typeof candidate === 'boolean') return candidate;
  if (typeof candidate !== 'string') {
    throw new Error(`${key} debe ser true o false.`);
  }
  const normalized = candidate.toLowerCase();
  if (!['true', 'false'].includes(normalized)) {
    throw new Error(`${key} debe ser true o false.`);
  }
  return normalized === 'true';
}

function httpUrl(config: Record<string, unknown>, key: string): string {
  const value = required(config, key);
  const protocol = new URL(value).protocol;
  if (!['http:', 'https:'].includes(protocol)) {
    throw new Error(`${key} debe ser una URL HTTP o HTTPS.`);
  }
  return value;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const databaseUrl = required(config, 'DATABASE_URL');
  if (!['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol)) {
    throw new Error('DATABASE_URL debe apuntar a PostgreSQL.');
  }
  const port = integerInRange(config.PORT, 'PORT', 3000, 1, 65535);
  const jwtSecret = required(config, 'JWT_SECRET');
  if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_SECRET debe contener al menos 32 bytes.');
  }
  const jwtAccessTtlSeconds = integerInRange(
    config.JWT_ACCESS_TTL_SECONDS,
    'JWT_ACCESS_TTL_SECONDS',
    1800,
    60,
    86400,
  );
  const jwtIdleTimeoutSeconds = integerInRange(
    config.JWT_IDLE_TIMEOUT_SECONDS,
    'JWT_IDLE_TIMEOUT_SECONDS',
    1800,
    60,
    86400,
  );
  const smtpHost = required(config, 'SMTP_HOST');
  const smtpPort = integerInRange(config.SMTP_PORT, 'SMTP_PORT', 587, 1, 65535);
  const smtpSecure = booleanValue(config.SMTP_SECURE, 'SMTP_SECURE', false);
  const smtpUser = required(config, 'SMTP_USER');
  const smtpPassword = required(config, 'SMTP_PASSWORD');
  const smtpFrom = required(config, 'SMTP_FROM');
  const emailVerificationUrl = httpUrl(config, 'EMAIL_VERIFICATION_URL');
  const emailVerificationSecret = required(config, 'EMAIL_VERIFICATION_SECRET');
  if (Buffer.byteLength(emailVerificationSecret, 'utf8') < 32) {
    throw new Error(
      'EMAIL_VERIFICATION_SECRET debe contener al menos 32 bytes.',
    );
  }
  const emailVerificationTtlMinutes = integerInRange(
    config.EMAIL_VERIFICATION_TTL_MINUTES,
    'EMAIL_VERIFICATION_TTL_MINUTES',
    30,
    5,
    1440,
  );
  return {
    ...config,
    DATABASE_URL: databaseUrl,
    PORT: port,
    JWT_SECRET: jwtSecret,
    JWT_ACCESS_TTL_SECONDS: jwtAccessTtlSeconds,
    JWT_IDLE_TIMEOUT_SECONDS: jwtIdleTimeoutSeconds,
    SMTP_HOST: smtpHost,
    SMTP_PORT: smtpPort,
    SMTP_SECURE: smtpSecure,
    SMTP_USER: smtpUser,
    SMTP_PASSWORD: smtpPassword,
    SMTP_FROM: smtpFrom,
    EMAIL_VERIFICATION_URL: emailVerificationUrl,
    EMAIL_VERIFICATION_SECRET: emailVerificationSecret,
    EMAIL_VERIFICATION_TTL_MINUTES: emailVerificationTtlMinutes,
  };
}
