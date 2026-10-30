import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { idEntidadValido } from '../../../../compartido/identificadores.js';

const JWT_ISSUER = 'stp-usuarios-auth';
const JWT_AUDIENCE = 'stp-clients';
const MAX_JTI_LENGTH = 64;
const MAX_TOKEN_LENGTH = 4096;
const TOKEN_SEGMENTO = /^[A-Za-z0-9_-]+$/;

export interface UsuarioAutenticado {
  sub: string;
  jti: string;
  correo_institucional: string;
  roles: string[];
}

export type RequestConUsuario = Request & { user?: UsuarioAutenticado };

function authNoDisponible(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    statusCode: 503,
    code: 'REPORT_AUTH_UNAVAILABLE',
    message: 'No fue posible verificar las credenciales del usuario.',
  });
}

export function noAutorizado(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    code: 'REPORT_UNAUTHORIZED',
    message: 'El token de acceso no es válido o expiró.',
  });
}

export function usuarioActual(request: RequestConUsuario): UsuarioAutenticado {
  if (!request.user) throw noAutorizado();
  return request.user;
}

function parseJsonSegment(segment: string): Record<string, unknown> | undefined {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function firmaValida(token: string, secret: string): boolean {
  const separador = token.lastIndexOf('.');
  const esperada = createHmac('sha256', secret)
    .update(token.slice(0, separador))
    .digest();
  const recibida = Buffer.from(token.slice(separador + 1), 'base64url');
  return (
    esperada.length === recibida.length && timingSafeEqual(esperada, recibida)
  );
}

function usuarioDesdePayload(
  payload: Record<string, unknown>,
): UsuarioAutenticado | undefined {
  const ahora = Math.floor(Date.now() / 1000);
  if (payload.iss !== JWT_ISSUER || payload.aud !== JWT_AUDIENCE) {
    return undefined;
  }
  if (
    typeof payload.exp !== 'number' ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= ahora
  ) {
    return undefined;
  }
  if (typeof payload.sub !== 'string' || !idEntidadValido(payload.sub)) {
    return undefined;
  }
  if (
    typeof payload.jti !== 'string' ||
    payload.jti.length === 0 ||
    payload.jti.length > MAX_JTI_LENGTH
  ) {
    return undefined;
  }
  if (typeof payload.correo_institucional !== 'string') return undefined;
  if (
    !Array.isArray(payload.roles) ||
    !payload.roles.every((rol) => typeof rol === 'string')
  ) {
    return undefined;
  }
  return {
    sub: payload.sub,
    jti: payload.jti,
    correo_institucional: payload.correo_institucional,
    roles: payload.roles as string[],
  };
}

@Injectable()
export class UsuarioJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw authNoDisponible();

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const authorization = request.headers.authorization;
    const match =
      typeof authorization === 'string'
        ? authorization.match(/^Bearer\s+(\S+)$/i)
        : undefined;
    if (!match || match[1].length > MAX_TOKEN_LENGTH) throw noAutorizado();

    const token = match[1];
    const segmentos = token.split('.');
    if (
      segmentos.length !== 3 ||
      !segmentos.every((s) => TOKEN_SEGMENTO.test(s))
    ) {
      throw noAutorizado();
    }

    const header = parseJsonSegment(segmentos[0]);
    if (!header || header.alg !== 'HS256') throw noAutorizado();
    if (header.typ !== undefined && header.typ !== 'JWT') throw noAutorizado();

    if (!firmaValida(token, secret)) throw noAutorizado();

    const payload = parseJsonSegment(segmentos[1]);
    const usuario = payload ? usuarioDesdePayload(payload) : undefined;
    if (!usuario) throw noAutorizado();

    request.user = usuario;
    return true;
  }
}
