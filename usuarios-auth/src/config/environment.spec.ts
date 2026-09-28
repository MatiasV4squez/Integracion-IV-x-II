import { validateEnvironment } from './environment';

describe('Configuración básica de autenticación', () => {
  const base = {
    DATABASE_URL: 'postgresql://test@localhost/stp_test',
    JWT_SECRET: 'secreto-de-prueba-con-al-menos-32-bytes',
    SMTP_HOST: 'smtp.example.test',
    SMTP_USER: 'usuario-smtp',
    SMTP_PASSWORD: 'secreto-smtp',
    SMTP_FROM: 'STP <no-reply@example.test>',
    EMAIL_VERIFICATION_URL: 'https://app.example.test/verificar-correo',
    EMAIL_VERIFICATION_SECRET: 'secreto-de-verificacion-con-al-menos-32-bytes',
  };

  it('configura valores seguros por defecto para JWT y correo', () => {
    expect(validateEnvironment(base)).toMatchObject({
      PORT: 3000,
      JWT_SECRET: base.JWT_SECRET,
      JWT_ACCESS_TTL_SECONDS: 1800,
      JWT_IDLE_TIMEOUT_SECONDS: 1800,
      SMTP_HOST: base.SMTP_HOST,
      SMTP_PORT: 587,
      SMTP_SECURE: false,
      EMAIL_VERIFICATION_URL: base.EMAIL_VERIFICATION_URL,
      EMAIL_VERIFICATION_SECRET: base.EMAIL_VERIFICATION_SECRET,
      EMAIL_VERIFICATION_TTL_MINUTES: 30,
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
    { JWT_IDLE_TIMEOUT_SECONDS: '59' },
    { JWT_IDLE_TIMEOUT_SECONDS: '86401' },
    { JWT_IDLE_TIMEOUT_SECONDS: 'media-hora' },
    { SMTP_HOST: undefined },
    { SMTP_PORT: '0' },
    { SMTP_PORT: 'no-es-puerto' },
    { SMTP_SECURE: 'quizas' },
    { SMTP_USER: undefined },
    { SMTP_PASSWORD: undefined },
    { SMTP_FROM: undefined },
    { EMAIL_VERIFICATION_URL: undefined },
    { EMAIL_VERIFICATION_URL: 'ftp://example.test/verificar' },
    { EMAIL_VERIFICATION_SECRET: undefined },
    { EMAIL_VERIFICATION_SECRET: 'secreto-corto' },
    { EMAIL_VERIFICATION_TTL_MINUTES: '4' },
    { EMAIL_VERIFICATION_TTL_MINUTES: '1441' },
  ])('rechaza una configuración inválida: %j', (override) => {
    expect(() => validateEnvironment({ ...base, ...override })).toThrow();
  });
});
