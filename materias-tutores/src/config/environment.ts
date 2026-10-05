export function validateEnvironment(config: Record<string, unknown>) {
  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error(
      'DATABASE_URL es obligatoria. Configura la conexión a PostgreSQL en .env.',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL debe ser una URL válida de PostgreSQL.');
  }

  if (
    !['postgres:', 'postgresql:'].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname ||
    parsedUrl.pathname.length <= 1
  ) {
    throw new Error(
      'DATABASE_URL debe indicar un servidor y una base de datos PostgreSQL.',
    );
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }

  const jwtSecret = config.JWT_SECRET;
  if (
    typeof jwtSecret !== 'string' ||
    Buffer.byteLength(jwtSecret, 'utf8') < 32
  ) {
    throw new Error('JWT_SECRET debe contener al menos 32 bytes.');
  }

  const integracionSecret = config.INTEGRACION_SECRET;
  if (
    integracionSecret !== undefined &&
    (typeof integracionSecret !== 'string' ||
      Buffer.byteLength(integracionSecret, 'utf8') < 32)
  ) {
    throw new Error('INTEGRACION_SECRET debe contener al menos 32 bytes.');
  }
  const rolUrl = config.USUARIOS_AUTH_ASIGNAR_TUTOR_URL;
  if (rolUrl !== undefined) {
    if (typeof rolUrl !== 'string')
      throw new Error(
        'USUARIOS_AUTH_ASIGNAR_TUTOR_URL debe ser una URL válida.',
      );
    try {
      const url = new URL(rolUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      throw new Error(
        'USUARIOS_AUTH_ASIGNAR_TUTOR_URL debe ser una URL HTTP válida.',
      );
    }
  }

  return {
    ...config,
    DATABASE_URL: databaseUrl,
    PORT: port,
    JWT_SECRET: jwtSecret,
  };
}
