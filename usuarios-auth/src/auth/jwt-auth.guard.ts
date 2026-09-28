import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from 'jsonwebtoken';
import type { Request } from 'express';
import { JWT_AUDIENCE, JWT_ISSUER } from './auth.constants';
import type { AuthenticatedUser } from './authenticated-user';
import { SessionService } from './session.service';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

interface SessionJwtPayload extends JwtPayload {
  correo_institucional: string;
  roles: string[];
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
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) throw unauthorized();

    let payload: SessionJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionJwtPayload>(match[1], {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
    } catch {
      throw unauthorized();
    }

    if (
      typeof payload.sub !== 'string' ||
      !/^[1-9]\d{0,18}$/.test(payload.sub) ||
      BigInt(payload.sub) > 9223372036854775807n ||
      typeof payload.jti !== 'string' ||
      payload.jti.length === 0 ||
      payload.jti.length > 64 ||
      typeof payload.exp !== 'number' ||
      typeof payload.correo_institucional !== 'string' ||
      !Array.isArray(payload.roles) ||
      !payload.roles.every((rol) => typeof rol === 'string')
    ) {
      throw unauthorized();
    }

    const activa = await this.sessions.registrarActividad(
      payload.sub,
      payload.jti,
    );
    if (!activa) throw unauthorized();

    request.user = {
      sub: payload.sub,
      jti: payload.jti,
      correo_institucional: payload.correo_institucional,
      roles: payload.roles,
    };
    return true;
  }
}
