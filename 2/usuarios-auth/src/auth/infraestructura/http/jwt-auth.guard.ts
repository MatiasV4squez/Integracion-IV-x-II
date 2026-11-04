import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  TOKEN_PROVIDER,
  type AuthenticatedUser,
  type TokenProvider,
} from '../../dominio/auth.ports';
import { SessionService } from '../../aplicacion/session.service';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

function unauthorized(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    code: 'AUTH_SESSION_INVALID',
    message: 'La sesión no es válida o expiró.',
  });
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_PROVIDER) private readonly tokens: TokenProvider,
    private readonly sesiones: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) throw unauthorized();
    const usuario = await this.tokens.verificar(match[1]);
    if (
      !usuario ||
      !(await this.sesiones.registrarActividad(usuario.sub, usuario.jti))
    ) {
      throw unauthorized();
    }
    request.user = usuario;
    return true;
  }
}
