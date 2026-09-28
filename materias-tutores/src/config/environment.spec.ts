import { validateEnvironment } from './environment.js';

describe('validateEnvironment', () => {
  const databaseUrl = 'postgresql://user:password@localhost:5432/materias';
  const jwtSecret = 'clave-ficticia-exclusiva-para-pruebas-0123456789';

  it('acepta PostgreSQL y convierte el puerto a número', () => {
    expect(
      validateEnvironment({
        DATABASE_URL: databaseUrl,
        PORT: '3001',
        JWT_SECRET: jwtSecret,
      }),
    ).toEqual({ DATABASE_URL: databaseUrl, PORT: 3001, JWT_SECRET: jwtSecret });
    expect(
      validateEnvironment({ DATABASE_URL: databaseUrl, JWT_SECRET: jwtSecret })
        .PORT,
    ).toBe(3000);
  });

  it.each([
    undefined,
    '',
    ' ',
    'invalid',
    'https://localhost/materias',
    'postgresql://localhost',
  ])('rechaza una conexión inválida sin revelar credenciales: %s', (url) => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: url, JWT_SECRET: jwtSecret }),
    ).toThrow(/DATABASE_URL/);
  });

  it.each(['', '0', '65536', '1.5', 'abc'])('rechaza el puerto %s', (port) => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: databaseUrl,
        PORT: port,
        JWT_SECRET: jwtSecret,
      }),
    ).toThrow(/PORT/);
  });

  it.each([undefined, '', 'secreto-corto'])(
    'rechaza JWT_SECRET inválido: %s',
    (secret) => {
      expect(() =>
        validateEnvironment({ DATABASE_URL: databaseUrl, JWT_SECRET: secret }),
      ).toThrow(/JWT_SECRET/);
    },
  );
});
