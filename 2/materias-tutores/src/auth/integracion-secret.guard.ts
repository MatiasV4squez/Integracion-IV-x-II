import { timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class IntegracionSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const clave = context.switchToHttp().getRequest<Request>().headers['x-integracion-secret'];
    const esperada = this.config.get<string>('INTEGRACION_SECRET');
    if (!esperada || Buffer.byteLength(esperada, 'utf8') < 32 || typeof clave !== 'string') {
      throw new UnauthorizedException('Integración no autorizada.');
    }
    const recibido = Buffer.from(clave);
    const secreto = Buffer.from(esperada);
    if (recibido.length !== secreto.length || !timingSafeEqual(recibido, secreto)) {
      throw new UnauthorizedException('Integración no autorizada.');
    }
    return true;
  }
}
