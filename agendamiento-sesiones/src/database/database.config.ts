export function getDatabaseUrl(environment: NodeJS.ProcessEnv): string {
  if (environment.DATABASE_URL) {
    return environment.DATABASE_URL;
  }

  const password = environment.DB_PASSWORD;
  if (!password) {
    throw new Error(
      'Configura DATABASE_URL o DB_PASSWORD para conectar PostgreSQL.',
    );
  }

  const port = Number(environment.DB_PORT ?? '5432');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT debe ser un puerto válido entre 1 y 65535.');
  }

  const host = environment.DB_HOST ?? '127.0.0.1';
  const username = encodeURIComponent(environment.DB_USERNAME ?? 'postgres');
  const database = encodeURIComponent(
    environment.DB_DATABASE ?? 'agendamiento_sesiones',
  );

  return `postgresql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}
