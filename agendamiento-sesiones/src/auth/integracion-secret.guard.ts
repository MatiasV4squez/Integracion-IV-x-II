import {CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException,} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class IntegracionSecretGuard implements CanActivate {
  canActivate(contexto: ExecutionContext): boolean {
    const secreto = process.env.MODERACION_INTEGRACION_SECRET;

    if (!secreto || Buffer.byteLength(secreto, 'utf8') < 32) {
      throw new ServiceUnavailableException(
        'El secreto de integración no está configurado correctamente.',
      );
    }

    const peticion = contexto.switchToHttp().getRequest<Request>();
    const recibido = peticion.headers['x-integracion-secret'];

    if (typeof recibido !== 'string') {
      throw new UnauthorizedException('Integración no autorizada.');
    }

    const esperado = Buffer.from(secreto, 'utf8');
    const actual = Buffer.from(recibido, 'utf8');

    if (
      esperado.length !== actual.length ||
      !timingSafeEqual(esperado, actual)
    ) {
      throw new UnauthorizedException('Integración no autorizada.');
    }

    return true;
  }
}
