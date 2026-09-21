import { validateEnvironment } from './environment';

describe('Configuración básica de autenticación', () => {
  const base = {
    DATABASE_URL: 'postgresql://test@localhost/stp_test',
    JWT_SECRET: 'secreto-de-prueba-con-al-menos-32-bytes',
  };

  it('configura valores seguros por defecto para el JWT', () => {
    expect(validateEnvironment(base)).toMatchObject({
      PORT: 3000,
      JWT_SECRET: base.JWT_SECRET,
      JWT_ACCESS_TTL_SECONDS: 1800,
    });
  });

  it.each([
    { DATABASE_URL: undefined },
    { DATABASE_URL: 'mysql://localhost/stp' },
    { PORT: 'abc' },
    { PORT: '0' },
    { JWT_SECRET: undefined },
    { JWT_SECRET: 'secreto-corto' },
    { JWT_ACCESS_TTL_SECONDS: '59' },
    { JWT_ACCESS_TTL_SECONDS: '86401' },
    { JWT_ACCESS_TTL_SECONDS: 'media-hora' },
  ])('rechaza una configuración inválida: %j', (override) => {
    expect(() => validateEnvironment({ ...base, ...override })).toThrow();
  });
});
