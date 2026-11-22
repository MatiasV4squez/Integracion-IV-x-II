import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';

const TIMEOUT_MS = 5_000;

@Injectable()
export class HttpSesionAuthClient {
  async validar(token: string, sub: string, jti: string): Promise<void> {
    const endpoint = this.endpoint();
    let respuesta: Response;
    try {
      respuesta = await fetch(endpoint, {
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'error',
        cache: 'no-store',
      });
    } catch {
      throw this.noDisponible();
    }

    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new UnauthorizedException('La sesión no es válida o expiró.');
    }
    if (respuesta.status !== 200) throw this.noDisponible();

    let sesion: unknown;
    try {
      sesion = await respuesta.json();
    } catch {
      throw this.noDisponible();
    }
    // Auth debe confirmar al mismo usuario y la misma sesión del JWT.
    if (
      !sesion ||
      typeof sesion !== 'object' ||
      !('sub' in sesion) ||
      sesion.sub !== sub ||
      !('jti' in sesion) ||
      sesion.jti !== jti
    ) {
      throw this.noDisponible();
    }
  }

  private endpoint(): URL {
    const base = process.env.USUARIOS_AUTH_URL;
    if (!base) throw this.noDisponible();
    try {
      const url = new URL(base.endsWith('/') ? base : `${base}/`);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      ) {
        throw new Error('USUARIOS_AUTH_URL inválida');
      }
      return new URL('auth/sesion', url);
    } catch {
      throw this.noDisponible();
    }
  }

  private noDisponible(): ServiceUnavailableException {
    return new ServiceUnavailableException('No fue posible validar la sesión con Auth.');
  }
}
