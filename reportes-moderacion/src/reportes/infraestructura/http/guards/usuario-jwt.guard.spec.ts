import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import {
  UsuarioJwtGuard,
  type RequestConUsuario,
} from './usuario-jwt.guard.js';

const JWT_SECRET = 'secreto-de-prueba';

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function firmar(
  payload: object,
  header: object = { alg: 'HS256', typ: 'JWT' },
  secret = JWT_SECRET,
): string {
  const encabezado = base64Url(header);
  const cuerpo = base64Url(payload);
  const firma = createHmac('sha256', secret)
    .update(`${encabezado}.${cuerpo}`)
    .digest('base64url');
  return `${encabezado}.${cuerpo}.${firma}`;
}

function payloadUsuario(overrides: object = {}): object {
  const ahora = Math.floor(Date.now() / 1000);
  return {
    iss: 'stp-usuarios-auth',
    aud: 'stp-clients',
    sub: '1',
    jti: 'jti-de-prueba',
    correo_institucional: 'estudiante@alu.uct.cl',
    roles: ['ESTUDIANTE'],
    iat: ahora,
    exp: ahora + 300,
    ...overrides,
  };
}

function contextoCon(
  headers: Record<string, string | undefined>,
): { context: ExecutionContext; request: RequestConUsuario } {
  const request = { headers, user: undefined } as unknown as RequestConUsuario;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function capturarError(fn: () => boolean): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('UsuarioJwtGuard', () => {
  let guard: UsuarioJwtGuard;

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    guard = new UsuarioJwtGuard();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('acepta un token válido sin exigir rol administrador', () => {
    const token = firmar(payloadUsuario());
    const { context, request } = contextoCon({
      authorization: `Bearer ${token}`,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({
      sub: '1',
      jti: 'jti-de-prueba',
      correo_institucional: 'estudiante@alu.uct.cl',
      roles: ['ESTUDIANTE'],
    });
  });

  it('rechaza una solicitud sin cabecera Authorization', () => {
    const { context } = contextoCon({});

    const error = capturarError(() => guard.canActivate(context));

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      code: 'REPORT_UNAUTHORIZED',
    });
  });

  it('rechaza un token firmado con otro secreto', () => {
    const token = firmar(payloadUsuario(), undefined, 'otro-secreto');
    const { context } = contextoCon({ authorization: `Bearer ${token}` });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('falla con 503 cuando no está configurado JWT_SECRET', () => {
    delete process.env.JWT_SECRET;
    const token = firmar(payloadUsuario());
    const { context } = contextoCon({ authorization: `Bearer ${token}` });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
