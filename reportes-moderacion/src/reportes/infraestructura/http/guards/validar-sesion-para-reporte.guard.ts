import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  SESIONES_REPORTE_VALIDATOR,
  type SesionesReporteValidator,
} from '../../../dominio/ports/sesiones-reporte-validator.js';
import { normalizarIdEntidad } from '../../../dominio/identificadores.js';
import {
  usuarioActual,
  type RequestConUsuario,
} from './usuario-jwt.guard.js';

interface ReporteRequestBody {
  id_sesion?: unknown;
  id_usuario_reportado?: unknown;
}

function sesionNoElegible(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: 'REPORT_SESSION_NOT_ELIGIBLE',
    message:
      'Solo puedes reportar a un usuario tras una sesión que haya sido confirmada.',
  });
}

function reportadorNoParticipante(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: 'REPORT_NOT_PARTICIPANT',
    message: 'Solo puedes reportar dentro de una sesión en la que participaste.',
  });
}

function reportadoInvalido(): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'REPORT_TARGET_INVALID',
    message:
      'id_usuario_reportado debe ser la contraparte de la sesión reportada.',
  });
}

@Injectable()
export class ValidarSesionParaReporteGuard implements CanActivate {
  constructor(
    @Inject(SESIONES_REPORTE_VALIDATOR)
    private readonly sesiones: SesionesReporteValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const reportador = usuarioActual(request).sub;
    const body = request.body as ReporteRequestBody | undefined;
    const idSesion = normalizarIdEntidad(body?.id_sesion);

    if (!idSesion) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'REPORT_SESSION_ID_INVALID',
        message: 'id_sesion debe ser un identificador de sesión válido.',
      });
    }

    const participacion = await this.sesiones.consultarParaReporte(idSesion);
    if (!participacion || !participacion.alcanzoEstadoConfirmada) {
      throw sesionNoElegible();
    }

    const { idTutor, idTutee } = participacion;
    if (reportador !== idTutor && reportador !== idTutee) {
      throw reportadorNoParticipante();
    }

    const contraparte = reportador === idTutor ? idTutee : idTutor;
    const reportado = normalizarIdEntidad(body?.id_usuario_reportado);
    if (reportado !== contraparte) {
      throw reportadoInvalido();
    }

    return true;
  }
}
