import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { JWT_AUDIENCE, JWT_ISSUER } from '../../auth.constants';
import type {
  AuthenticatedUser,
  IdentidadAutenticada,
  TokenEmitido,
  TokenProvider,
} from '../../dominio/auth.ports';
import { usuarioIdValido } from '../../dominio/usuario-id';

@Injectable()
export class TokenService implements TokenProvider {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async emitir(usuario: IdentidadAutenticada): Promise<TokenEmitido> {
    const expiraEnSegundos = this.config.getOrThrow<number>(
      'JWT_ACCESS_TTL_SECONDS',
    );
    const jti = randomUUID();
    const iat = Math.floor(Date.now() / 1000);
    const valor = await this.jwt.signAsync({
      sub: usuario.id_usuario,
      jti,
      correo_institucional: usuario.correo_institucional,
      roles: usuario.roles,
      iat,
    });
    return {
      valor,
      jti,
      fechaExpiracion: new Date((iat + expiraEnSegundos) * 1000),
      expiraEnSegundos,
    };
  }

  async verificar(token: string): Promise<AuthenticatedUser | null> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
    } catch {
      return null;
    }
    if (
      !usuarioIdValido(payload.sub) ||
      typeof payload.jti !== 'string' ||
      payload.jti.length === 0 ||
      payload.jti.length > 64 ||
      typeof payload.exp !== 'number' ||
      !Number.isInteger(payload.exp) ||
      typeof payload.correo_institucional !== 'string' ||
      !Array.isArray(payload.roles) ||
      !payload.roles.every((rol): rol is string => typeof rol === 'string')
    )
      return null;
    return {
      sub: payload.sub,
      jti: payload.jti,
      correo_institucional: payload.correo_institucional,
      roles: payload.roles,
    };
  }
}
