import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { IntegracionSecretGuard } from './integracion-secret.guard.js';

const SECRETO = 'secreto-de-integracion-de-32-bytes-minimo';

function contextoCon(
  headers: Record<string, string | undefined>,
): ExecutionContext {
  const request = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function capturarError(fn: () => boolean): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('IntegracionSecretGuard', () => {
  let guard: IntegracionSecretGuard;

  beforeEach(() => {
    process.env.MODERACION_INTEGRACION_SECRET = SECRETO;
    guard = new IntegracionSecretGuard();
  });

  afterEach(() => {
    delete process.env.MODERACION_INTEGRACION_SECRET;
  });

  it('acepta una solicitud con el secreto correcto', () => {
    const context = contextoCon({ 'x-integracion-secret': SECRETO });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rechaza con 401 un secreto distinto', () => {
    const context = contextoCon({
      'x-integracion-secret': 'otro-secreto-incorrecto-de-32-bytes-min',
    });

    const error = capturarError(() => guard.canActivate(context));

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      code: 'INTEGRACION_UNAUTHORIZED',
    });
  });

  it('rechaza con 401 la ausencia de la cabecera del secreto', () => {
    const context = contextoCon({});

    expect(capturarError(() => guard.canActivate(context))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('falla con 503 cuando no está configurado MODERACION_INTEGRACION_SECRET', () => {
    delete process.env.MODERACION_INTEGRACION_SECRET;
    const context = contextoCon({ 'x-integracion-secret': SECRETO });

    const error = capturarError(() => guard.canActivate(context));

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
      code: 'INTEGRACION_SECRET_UNAVAILABLE',
    });
  });
});
