import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  SESIONES_REPORTE_VALIDATOR,
  type SesionesReporteValidator,
} from '../ports/sesiones-reporte-validator.js';

const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

interface ReporteRequestBody {
  id_sesion?: unknown;
}

function idSesionValido(value: unknown): string | undefined {
  if (typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value)) {
    return BigInt(value) <= MAX_POSTGRES_BIGINT ? value : undefined;
  }
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  return undefined;
}

@Injectable()
export class ValidarSesionParaReporteGuard implements CanActivate {
  constructor(
    @Inject(SESIONES_REPORTE_VALIDATOR)
    private readonly sesiones: SesionesReporteValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as ReporteRequestBody | undefined;
    const idSesion = idSesionValido(body?.id_sesion);

    if (!idSesion) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'REPORT_SESSION_ID_INVALID',
        message: 'id_sesion debe ser un identificador de sesión válido.',
      });
    }

    if (!(await this.sesiones.alcanzoEstadoConfirmada(idSesion))) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'REPORT_SESSION_NOT_ELIGIBLE',
        message:
          'Solo puedes reportar a un usuario tras una sesión que haya sido confirmada.',
      });
    }

    return true;
  }
}
