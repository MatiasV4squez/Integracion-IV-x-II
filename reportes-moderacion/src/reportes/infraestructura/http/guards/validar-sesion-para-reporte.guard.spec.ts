import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { ValidarSesionParaReporteGuard } from './validar-sesion-para-reporte.guard.js';
import type { SesionesReporteValidator } from '../../../dominio/ports/sesiones-reporte-validator.js';
import type { RequestConUsuario } from './usuario-jwt.guard.js';

interface OpcionesRequest {
  sub?: string;
  body?: Record<string, unknown>;
}

function contextoCon(
  opciones: OpcionesRequest,
): { context: ExecutionContext; request: RequestConUsuario } {
  const request = {
    body: opciones.body,
    user:
      opciones.sub === undefined
        ? undefined
        : {
            sub: opciones.sub,
            jti: 'jti-de-prueba',
            correo_institucional: 'usuario@alu.uct.cl',
            roles: ['ESTUDIANTE'],
          },
  } as unknown as RequestConUsuario;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

async function capturarError(promise: Promise<boolean>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

function codigo(error: unknown): unknown {
  type ConGetResponse = { getResponse(): { code?: string } };
  return (error as ConGetResponse).getResponse().code;
}

describe('ValidarSesionParaReporteGuard', () => {
  const mockConsultar = vi.fn();
  let guard: ValidarSesionParaReporteGuard;

  const participacionConfirmada = {
    alcanzoEstadoConfirmada: true,
    idTutor: '1',
    idTutee: '2',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new ValidarSesionParaReporteGuard({
      consultarParaReporte: mockConsultar,
    } as unknown as SesionesReporteValidator);
  });

  it('permite al tutor reportar al tutee de una sesión confirmada', async () => {
    mockConsultar.mockResolvedValue(participacionConfirmada);
    const { context } = contextoCon({
      sub: '1',
      body: { id_sesion: '10', id_usuario_reportado: '2' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(mockConsultar).toHaveBeenCalledWith('10');
  });

  it('permite al tutee reportar al tutor de una sesión confirmada', async () => {
    mockConsultar.mockResolvedValue(participacionConfirmada);
    const { context } = contextoCon({
      sub: '2',
      body: { id_sesion: '10', id_usuario_reportado: '1' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rechaza con 401 una solicitud sin usuario autenticado', async () => {
    const { context } = contextoCon({
      body: { id_sesion: '10', id_usuario_reportado: '2' },
    });

    const error = await capturarError(guard.canActivate(context));

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(codigo(error)).toBe('REPORT_UNAUTHORIZED');
    expect(mockConsultar).not.toHaveBeenCalled();
  });

  it('rechaza con 400 un id_sesion inválido', async () => {
    const { context } = contextoCon({
      sub: '1',
      body: { id_sesion: 'abc', id_usuario_reportado: '2' },
    });

    const error = await capturarError(guard.canActivate(context));

    expect(error).toBeInstanceOf(BadRequestException);
    expect(codigo(error)).toBe('REPORT_SESSION_ID_INVALID');
    expect(mockConsultar).not.toHaveBeenCalled();
  });

  it('rechaza con 403 una sesión inexistente', async () => {
    mockConsultar.mockResolvedValue(null);
    const { context } = contextoCon({
      sub: '1',
      body: { id_sesion: '10', id_usuario_reportado: '2' },
    });

    const error = await capturarError(guard.canActivate(context));

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(codigo(error)).toBe('REPORT_SESSION_NOT_ELIGIBLE');
  });

  it('rechaza con 403 una sesión que no alcanzó el estado confirmada', async () => {
    mockConsultar.mockResolvedValue({
      ...participacionConfirmada,
      alcanzoEstadoConfirmada: false,
    });
    const { context } = contextoCon({
      sub: '1',
      body: { id_sesion: '10', id_usuario_reportado: '2' },
    });

    const error = await capturarError(guard.canActivate(context));

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(codigo(error)).toBe('REPORT_SESSION_NOT_ELIGIBLE');
  });

  it('rechaza con 403 un reportador que no participó en la sesión', async () => {
    mockConsultar.mockResolvedValue(participacionConfirmada);
    const { context } = contextoCon({
      sub: '3',
      body: { id_sesion: '10', id_usuario_reportado: '2' },
    });

    const error = await capturarError(guard.canActivate(context));

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(codigo(error)).toBe('REPORT_NOT_PARTICIPANT');
  });

  it('rechaza con 400 un reportado que no es la contraparte', async () => {
    mockConsultar.mockResolvedValue(participacionConfirmada);
    const { context } = contextoCon({
      sub: '1',
      body: { id_sesion: '10', id_usuario_reportado: '3' },
    });

    const error = await capturarError(guard.canActivate(context));

    expect(error).toBeInstanceOf(BadRequestException);
    expect(codigo(error)).toBe('REPORT_TARGET_INVALID');
  });

  it('rechaza con 400 un auto-reporte', async () => {
    mockConsultar.mockResolvedValue(participacionConfirmada);
    const { context } = contextoCon({
      sub: '1',
      body: { id_sesion: '10', id_usuario_reportado: '1' },
    });

    const error = await capturarError(guard.canActivate(context));

    expect(error).toBeInstanceOf(BadRequestException);
    expect(codigo(error)).toBe('REPORT_TARGET_INVALID');
  });
});
