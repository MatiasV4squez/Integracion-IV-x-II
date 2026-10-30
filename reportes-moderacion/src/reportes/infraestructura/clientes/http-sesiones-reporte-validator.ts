import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  ParticipacionSesion,
  SesionesReporteValidator,
} from '../../dominio/ports/sesiones-reporte-validator.js';
import { idEntidadValido } from '../../dominio/identificadores.js';

const TIMEOUT_MS = 5_000;

interface ValidacionReporteResponse {
  alcanzo_estado_confirmada: boolean;
  id_tutor: string;
  id_tutee: string;
}

function servicioSesionesNoDisponible(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    statusCode: 503,
    code: 'SESIONES_SERVICE_UNAVAILABLE',
    message: 'No fue posible validar la sesión para emitir el reporte.',
  });
}

function isValidacionReporteResponse(
  value: unknown,
): value is ValidacionReporteResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'alcanzo_estado_confirmada' in value &&
    typeof value.alcanzo_estado_confirmada === 'boolean' &&
    'id_tutor' in value &&
    typeof value.id_tutor === 'string' &&
    idEntidadValido(value.id_tutor) &&
    'id_tutee' in value &&
    typeof value.id_tutee === 'string' &&
    idEntidadValido(value.id_tutee)
  );
}

@Injectable()
export class HttpSesionesReporteValidator implements SesionesReporteValidator {
  async consultarParaReporte(
    idSesion: string,
  ): Promise<ParticipacionSesion | null> {
    const endpoint = this.endpoint(idSesion);
    let response: Response;

    try {
      response = await fetch(endpoint, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw servicioSesionesNoDisponible();
    }

    if (response.status === 404) return null;
    if (!response.ok) throw servicioSesionesNoDisponible();

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw servicioSesionesNoDisponible();
    }

    if (!isValidacionReporteResponse(data)) {
      throw servicioSesionesNoDisponible();
    }

    return {
      alcanzoEstadoConfirmada: data.alcanzo_estado_confirmada,
      idTutor: data.id_tutor,
      idTutee: data.id_tutee,
    };
  }

  private endpoint(idSesion: string): URL {
    const serviceUrl = process.env.SESIONES_SERVICE_URL;
    if (!serviceUrl) throw servicioSesionesNoDisponible();

    try {
      const baseUrl = new URL(
        serviceUrl.endsWith('/') ? serviceUrl : `${serviceUrl}/`,
      );
      if (!['http:', 'https:'].includes(baseUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
      return new URL(
        `sesiones/${encodeURIComponent(idSesion)}/validacion-reporte`,
        baseUrl,
      );
    } catch {
      throw servicioSesionesNoDisponible();
    }
  }
}
