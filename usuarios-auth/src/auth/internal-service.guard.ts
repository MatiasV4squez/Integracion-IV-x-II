import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

interface InternalRequest {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<InternalRequest>();
    const header = request.headers['x-internal-service-key'];
    const providedKey = Array.isArray(header) ? undefined : header;
    const expectedKey = this.config.getOrThrow<string>('INTERNAL_SERVICE_API_KEY');

    if (!providedKey || !this.matches(providedKey, expectedKey)) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTH_INTERNAL_UNAUTHORIZED',
        message: 'Credenciales de servicio interno invalidas.',
      });
    }
    return true;
  }

  private matches(providedKey: string, expectedKey: string): boolean {
    const provided = Buffer.from(providedKey);
    const expected = Buffer.from(expectedKey);
    return (
      provided.length === expected.length && timingSafeEqual(provided, expected)
    );
  }
}
