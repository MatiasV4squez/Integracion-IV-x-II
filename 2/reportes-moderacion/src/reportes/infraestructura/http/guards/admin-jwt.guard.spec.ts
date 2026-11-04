import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { AdminJwtGuard } from './admin-jwt.guard.js';
import type { RequestConUsuario } from './usuario-jwt.guard.js';

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

function payloadAdministrador(overrides: object = {}): object {
  const ahora = Math.floor(Date.now() / 1000);
  return {
    iss: 'stp-usuarios-auth',
    aud: 'stp-clients',
    sub: '9',
    jti: 'jti-de-prueba',
    correo_institucional: 'admin@alu.uct.cl',
    roles: ['ADMINISTRADOR'],
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

describe('AdminJwtGuard', () => {
  let guard: AdminJwtGuard;

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    guard = new AdminJwtGuard();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('acepta un token válido con rol administrador y expone al usuario', () => {
    const token = firmar(payloadAdministrador());
    const { context, request } = contextoCon({ authorization: `Bearer ${token}` });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({
      sub: '9',
      jti: 'jti-de-prueba',
      correo_institucional: 'admin@alu.uct.cl',
      roles: ['ADMINISTRADOR'],
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

  it('rechaza un esquema que no sea Bearer', () => {
    const token = firmar(payloadAdministrador());
    const { context } = contextoCon({ authorization: `Basic ${token}` });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token con estructura inválida', () => {
    const { context } = contextoCon({ authorization: 'Bearer no-es-un-jwt' });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token firmado con otro secreto', () => {
    const token = firmar(payloadAdministrador(), undefined, 'otro-secreto');
    const { context } = contextoCon({ authorization: `Bearer ${token}` });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token con algoritmo none', () => {
    const token = firmar(payloadAdministrador(), { alg: 'none', typ: 'JWT' });
    const { context } = contextoCon({ authorization: `Bearer ${token}` });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token expirado', () => {
    const ahora = Math.floor(Date.now() / 1000);
    const token = firmar(payloadAdministrador({ exp: ahora - 1 }));
    const { context } = contextoCon({ authorization: `Bearer ${token}` });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token con emisor desconocido', () => {
    const token = firmar(payloadAdministrador({ iss: 'otro-servicio' }));
    const { context } = contextoCon({ authorization: `Bearer ${token}` });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token con audiencia distinta', () => {
    const token = firmar(payloadAdministrador({ aud: 'otra-audiencia' }));
    const { context } = contextoCon({ authorization: `Bearer ${token}` });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token con identificador de usuario inválido', () => {
    const token = firmar(payloadAdministrador({ sub: '0' }));
    const { context } = contextoCon({ authorization: `Bearer ${token}` });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza con 403 un token válido sin rol administrador', () => {
    const token = firmar(payloadAdministrador({ roles: ['ESTUDIANTE'] }));
    const { context } = contextoCon({ authorization: `Bearer ${token}` });

    const error = capturarError(() => guard.canActivate(context));

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: 'REPORT_ADMIN_REQUIRED',
    });
  });

  it('falla con 503 cuando no está configurado JWT_SECRET', () => {
    delete process.env.JWT_SECRET;
    const token = firmar(payloadAdministrador());
    const { context } = contextoCon({ authorization: `Bearer ${token}` });

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
