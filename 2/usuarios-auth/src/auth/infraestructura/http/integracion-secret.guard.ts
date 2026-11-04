import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class IntegracionSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const header = request.headers['x-integracion-secret'];
    const provided = Buffer.from(typeof header === 'string' ? header : '');
    const expected = Buffer.from(
      this.config.get<string>('INTEGRACION_SECRET') ?? '',
    );
    if (
      !expected.length ||
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throw new UnauthorizedException('Credenciales de integración inválidas.');
    }
    return true;
  }
}
