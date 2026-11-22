import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest } from './autenticacion-request';
import { HttpSesionAuthClient } from './http-sesion-auth.client';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        @Inject(JwtService) private readonly jwtService: JwtService,
        @Inject(HttpSesionAuthClient) private readonly sesiones: HttpSesionAuthClient,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        const authorization = request.headers.authorization;
        const match = authorization?.match(/^Bearer\s+(\S+)$/i);

        if (!match) {
            throw new UnauthorizedException('Debes enviar un token Bearer.');
        }

        let payload: Record<string, unknown>;

        try {
            payload = await this.jwtService.verifyAsync<
                Record<string, unknown>
            >(match[1]);
        } catch {
            throw new UnauthorizedException('Token inválido o expirado.');
        }

        if (
            typeof payload.sub !== 'string' ||
            !/^[1-9][0-9]{0,18}$/.test(payload.sub)
        ) {
            throw new UnauthorizedException(
                'El token no contiene un identificador de usuario válido.',
            );
        }

        if (BigInt(payload.sub) > 9223372036854775807n) {
            throw new UnauthorizedException(
                'El identificador del usuario supera el máximo permitido.',
            );
        }

        if (
            typeof payload.exp !== 'number' ||
            !Number.isFinite(payload.exp) ||
            payload.exp <= Date.now() / 1000
        ) {
            throw new UnauthorizedException(
                'El token no contiene una vigencia válida.',
            );
        }
        const roles = payload.roles;
        if (
            !Array.isArray(roles) ||
            !roles.every((rol: unknown) => typeof rol === 'string')
        ) {
            throw new UnauthorizedException(
                'El token no contiene roles válidos.',
            );
        }

        if (typeof payload.jti !== 'string' || payload.jti.length < 1 || payload.jti.length > 64) {
            throw new UnauthorizedException('El token no contiene una sesión válida.');
        }
        await this.sesiones.validar(match[1], payload.sub, payload.jti);

        request.user = {
            idUsuario: payload.sub,
            roles: roles as string[],
        };

        return true;
    }
}
