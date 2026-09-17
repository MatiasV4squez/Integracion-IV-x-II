function required(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Falta la variable de entorno ${key}.`);
  }
  return value.trim();
}

export function validateEnvironment(config: Record<string, unknown>) {
  const databaseUrl = required(config, 'DATABASE_URL');
  if (!['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol)) {
    throw new Error('DATABASE_URL debe apuntar a PostgreSQL.');
  }
  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }
  return {
    ...config,
    DATABASE_URL: databaseUrl,
    PORT: port,
  };
}
