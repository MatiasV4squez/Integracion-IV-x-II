import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  CambioEstadoCuentaRespuesta,
  EstadoCuentaModerable,
  UsuariosAuthClient,
} from '../ports/usuarios-auth-client.js';

const TIMEOUT_MS = 5_000;

function usuariosAuthNoDisponible(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    statusCode: 503,
    code: 'USUARIOS_AUTH_UNAVAILABLE',
    message: 'No fue posible actualizar el estado de la cuenta del usuario.',
  });
}

function esRespuestaCambioEstado(
  value: unknown,
): value is CambioEstadoCuentaRespuesta {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id_usuario' in value &&
    'estado_cuenta' in value &&
    typeof value.id_usuario === 'string' &&
    (value.estado_cuenta === 'SUSPENDIDO' || value.estado_cuenta === 'ACTIVO')
  );
}

@Injectable()
export class HttpUsuariosAuthClient implements UsuariosAuthClient {
  async cambiarEstadoCuenta(
    idUsuario: string,
    estado: EstadoCuentaModerable,
  ): Promise<CambioEstadoCuentaRespuesta> {
    const endpoint = this.endpoint(idUsuario);
    const internalServiceApiKey = process.env.INTERNAL_SERVICE_API_KEY;
    if (!internalServiceApiKey) throw usuariosAuthNoDisponible();

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-internal-service-key': internalServiceApiKey,
        },
        body: JSON.stringify({ estado }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw usuariosAuthNoDisponible();
    }

    if (!response.ok) throw usuariosAuthNoDisponible();

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw usuariosAuthNoDisponible();
    }
    if (!esRespuestaCambioEstado(data)) throw usuariosAuthNoDisponible();

    return data;
  }

  private endpoint(idUsuario: string): URL {
    const serviceUrl = process.env.USUARIOS_AUTH_URL;
    if (!serviceUrl) throw usuariosAuthNoDisponible();

    try {
      const baseUrl = new URL(
        serviceUrl.endsWith('/') ? serviceUrl : `${serviceUrl}/`,
      );
      if (!['http:', 'https:'].includes(baseUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
      return new URL(
        `internal/usuarios/${encodeURIComponent(idUsuario)}/estado-cuenta`,
        baseUrl,
      );
    } catch {
      throw usuariosAuthNoDisponible();
    }
  }
}
