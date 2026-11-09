import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { HttpSesionesReporteValidator } from './http-sesiones-reporte-validator.js';

const SERVICE_URL = 'http://agendamiento.local:3001';
const SECRET = 's'.repeat(32);

function respuestaJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function capturarError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('HttpSesionesReporteValidator', () => {
  let validator: HttpSesionesReporteValidator;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubEnv('SESIONES_SERVICE_URL', SERVICE_URL);
    vi.stubEnv('MODERACION_INTEGRACION_SECRET', SECRET);
    validator = new HttpSesionesReporteValidator();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('consulta la participación y el estado de la sesión', async () => {
    mockFetch.mockResolvedValue(
      respuestaJson({
        alcanzo_estado_confirmada: true,
        id_tutor: '1',
        id_tutee: '2',
      }),
    );

    const resultado = await validator.consultarParaReporte('10');

    expect(mockFetch).toHaveBeenCalledWith(
      new URL(`${SERVICE_URL}/sessions/10/validacion-reporte`),
      expect.objectContaining({
        headers: {
          accept: 'application/json',
          'x-integracion-secret': SECRET,
        },
      }),
    );
    expect(resultado).toEqual({
      alcanzoEstadoConfirmada: true,
      idTutor: '1',
      idTutee: '2',
    });
  });

  it('devuelve null cuando la sesión no existe', async () => {
    mockFetch.mockResolvedValue(respuestaJson({ error: 'no encontrada' }, 404));

    await expect(validator.consultarParaReporte('10')).resolves.toBeNull();
  });

  it('falla con 503 cuando la respuesta omite los participantes', async () => {
    mockFetch.mockResolvedValue(
      respuestaJson({ alcanzo_estado_confirmada: true }),
    );

    const error = await capturarError(validator.consultarParaReporte('10'));

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
      code: 'SESIONES_SERVICE_UNAVAILABLE',
    });
  });

  it('falla con 503 cuando el servicio responde con un error', async () => {
    mockFetch.mockResolvedValue(respuestaJson({}, 500));

    expect(
      await capturarError(validator.consultarParaReporte('10')),
    ).toBeInstanceOf(ServiceUnavailableException);
  });

  it('falla con 503 ante un error de red', async () => {
    mockFetch.mockRejectedValue(new Error('network'));

    expect(
      await capturarError(validator.consultarParaReporte('10')),
    ).toBeInstanceOf(ServiceUnavailableException);
  });

  it('falla con 503 cuando falta SESIONES_SERVICE_URL', async () => {
    vi.stubEnv('SESIONES_SERVICE_URL', undefined);

    expect(
      await capturarError(validator.consultarParaReporte('10')),
    ).toBeInstanceOf(ServiceUnavailableException);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'corto'])(
    'falla con 503 sin enviar la petición cuando el secreto es inválido: %s',
    async (secreto) => {
      vi.stubEnv('MODERACION_INTEGRACION_SECRET', secreto);

      await expect(validator.consultarParaReporte('10')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );
});
