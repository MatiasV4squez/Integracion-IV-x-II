import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { parsePositiveId } from './parse-positive-id.js';

export interface TutorRequest extends Request {
  idTutor: bigint;
}

@Injectable()
export class TutorJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TutorRequest>();
    const match = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      throw new UnauthorizedException('Token Bearer requerido');
    }

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(match[1], {
        algorithms: ['HS256'],
        issuer: 'stp-usuarios-auth',
        audience: 'stp-clients',
      });
    } catch {
      throw new UnauthorizedException('Token inválido o vencido');
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new UnauthorizedException('Token inválido');
    }

    const claims = payload as Record<string, unknown>;
    const idTutor = parsePositiveId(claims.sub);
    if (
      idTutor === null ||
      typeof claims.jti !== 'string' ||
      claims.jti.length < 1 ||
      claims.jti.length > 64 ||
      typeof claims.correo_institucional !== 'string' ||
      typeof claims.exp !== 'number' ||
      !Array.isArray(claims.roles) ||
      !claims.roles.every((role: unknown) => typeof role === 'string')
    ) {
      throw new UnauthorizedException('Token inválido');
    }

    if (
      !claims.roles.some(
        (role: string) => role.trim().toUpperCase() === 'TUTOR',
      )
    ) {
      throw new ForbiddenException('Se requiere el rol de tutor');
    }

    request.idTutor = idTutor;
    return true;
  }
}
