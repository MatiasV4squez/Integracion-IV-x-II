import { validateEnvironment } from './environment.js';

describe('validateEnvironment', () => {
  const databaseUrl = 'postgresql://user:password@localhost:5432/materias';

  it('acepta PostgreSQL y convierte el puerto a número', () => {
    expect(
      validateEnvironment({ DATABASE_URL: databaseUrl, PORT: '3001' }),
    ).toEqual({ DATABASE_URL: databaseUrl, PORT: 3001 });
    expect(validateEnvironment({ DATABASE_URL: databaseUrl }).PORT).toBe(3000);
  });

  it.each([
    undefined,
    '',
    ' ',
    'invalid',
    'https://localhost/materias',
    'postgresql://localhost',
  ])('rechaza una conexión inválida sin revelar credenciales: %s', (url) => {
    expect(() => validateEnvironment({ DATABASE_URL: url })).toThrow(
      /DATABASE_URL/,
    );
  });

  it.each(['', '0', '65536', '1.5', 'abc'])('rechaza el puerto %s', (port) => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: databaseUrl, PORT: port }),
    ).toThrow(/PORT/);
  });
});
