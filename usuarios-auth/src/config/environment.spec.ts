import { validateEnvironment } from './environment';

describe('Configuración básica de autenticación', () => {
  const base = {
    DATABASE_URL: 'postgresql://test@localhost/stp_test',
  };

  it('solo requiere la base de datos para el login', () => {
    expect(validateEnvironment(base)).toMatchObject({ PORT: 3000 });
  });

  it.each([
    { DATABASE_URL: undefined },
    { DATABASE_URL: 'mysql://localhost/stp' },
    { PORT: 'abc' },
    { PORT: '0' },
  ])('rechaza una configuración inválida: %j', (override) => {
    expect(() => validateEnvironment({ ...base, ...override })).toThrow();
  });
});
