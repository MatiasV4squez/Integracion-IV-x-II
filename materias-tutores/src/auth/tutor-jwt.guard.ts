import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AuthenticatedJwtGuard,
  type AuthenticatedRequest,
} from './authenticated-jwt.guard.js';

export interface TutorRequest extends AuthenticatedRequest {
  idTutor: bigint;
}

@Injectable()
export class TutorJwtGuard extends AuthenticatedJwtGuard {
  constructor(jwt: JwtService) {
    super(jwt);
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
