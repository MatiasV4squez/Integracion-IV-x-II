import { ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedJwtGuard, type AuthenticatedRequest } from './authenticated-jwt.guard.js';
import { HttpSesionAuthClient } from './http-sesion-auth.client.js';

export interface TutorRequest extends AuthenticatedRequest {
  idTutor: bigint;
}

@Injectable()
export class TutorJwtGuard extends AuthenticatedJwtGuard {
  constructor(
    @Inject(JwtService) jwt: JwtService,
    @Inject(HttpSesionAuthClient) sesiones: HttpSesionAuthClient,
  ) {
    super(jwt, sesiones);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<TutorRequest>();
    if (!request.roles.some((role) => role.trim().toUpperCase() === 'TUTOR')) {
      throw new ForbiddenException('Se requiere el rol de tutor');
    }

    request.idTutor = request.idUsuario;
    return true;
  }
}
