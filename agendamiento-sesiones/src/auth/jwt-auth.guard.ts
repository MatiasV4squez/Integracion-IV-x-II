import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest } from './autenticacion-request';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

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

        request.user = {
            idUsuario: payload.sub,
        };

        return true;
    }
}