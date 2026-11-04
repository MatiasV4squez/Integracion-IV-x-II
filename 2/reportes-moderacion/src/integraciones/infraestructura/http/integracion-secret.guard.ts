import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const HEADER_SECRETO = 'x-integracion-secret';

function secretoNoConfigurado(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    statusCode: 503,
    code: 'INTEGRACION_SECRET_UNAVAILABLE',
    message: 'El secreto de integración no está configurado.',
  });
}

function noAutorizado(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    code: 'INTEGRACION_UNAUTHORIZED',
    message: 'El secreto de integración no es válido.',
  });
}

@Injectable()
export class IntegracionSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secreto = process.env.MODERACION_INTEGRACION_SECRET;
    if (!secreto) throw secretoNoConfigurado();

    const request = context.switchToHttp().getRequest<Request>();
    const recibido = request.headers[HEADER_SECRETO];
    if (typeof recibido !== 'string' || recibido.length === 0) {
      throw noAutorizado();
    }

    const esperada = Buffer.from(secreto, 'utf8');
    const actual = Buffer.from(recibido, 'utf8');
    if (esperada.length !== actual.length || !timingSafeEqual(esperada, actual)) {
      throw noAutorizado();
    }

    return true;
  }
}
