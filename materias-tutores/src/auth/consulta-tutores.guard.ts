import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedJwtGuard } from './authenticated-jwt.guard.js';
import { IntegracionSecretGuard } from './integracion-secret.guard.js';

@Injectable()
export class ConsultaTutoresGuard implements CanActivate {
  constructor(
    private readonly usuarios: AuthenticatedJwtGuard,
    private readonly integraciones: IntegracionSecretGuard,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const { headers } = context.switchToHttp().getRequest<Request>();
    if (headers.authorization !== undefined || headers['x-integracion-secret'] === undefined) {
      return this.usuarios.canActivate(context);
    }
    return this.integraciones.canActivate(context);
  }
}
