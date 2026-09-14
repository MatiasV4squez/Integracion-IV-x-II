import { getDatabaseUrl } from './database.config';

describe('getDatabaseUrl', () => {
  it('prioriza DATABASE_URL sobre las variables DB_*', () => {
    const databaseUrl = 'postgresql://user:pass@localhost:5432/sesiones';

    expect(
      getDatabaseUrl({ DATABASE_URL: databaseUrl, DB_PORT: 'invalid' }),
    ).toBe(databaseUrl);
  });

  it('preserva caracteres reservados en las credenciales y el nombre de la base', () => {
    const url = new URL(
      getDatabaseUrl({
        DB_HOST: 'localhost',
        DB_PORT: '5433',
        DB_USERNAME: 'tutor@local',
        DB_PASSWORD: 'p@ss:/?#%',
        DB_DATABASE: 'sesiones prueba',
      }),
    );

    expect(url.hostname).toBe('localhost');
    expect(url.port).toBe('5433');
    expect(decodeURIComponent(url.username)).toBe('tutor@local');
    expect(decodeURIComponent(url.password)).toBe('p@ss:/?#%');
    expect(decodeURIComponent(url.pathname)).toBe('/sesiones prueba');
  });

  it('rechaza una configuración sin credenciales', () => {
    expect(() => getDatabaseUrl({})).toThrow(
      'Configura DATABASE_URL o DB_PASSWORD',
    );
  });

  it.each(['invalid', '0', '65536', '5432.5', ''])(
    'rechaza el puerto inválido %s',
    (port) => {
      expect(() =>
        getDatabaseUrl({ DB_PASSWORD: 'test', DB_PORT: port }),
      ).toThrow('DB_PORT');
    },
  );
});
