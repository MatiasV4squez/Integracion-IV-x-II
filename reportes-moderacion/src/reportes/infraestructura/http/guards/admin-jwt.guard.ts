import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  UsuarioJwtGuard,
  usuarioActual,
  type RequestConUsuario,
} from './usuario-jwt.guard.js';

const ROL_ADMINISTRADOR = 'ADMINISTRADOR';

function rolInsuficiente(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: 'REPORT_ADMIN_REQUIRED',
    message: 'Se requiere el rol ADMINISTRADOR para esta operación.',
  });
}

@Injectable()
export class AdminJwtGuard extends UsuarioJwtGuard {
  canActivate(context: ExecutionContext): boolean {
    if (!super.canActivate(context)) return false;

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    if (!usuarioActual(request).roles.includes(ROL_ADMINISTRADOR)) {
      throw rolInsuficiente();
    }
    return true;
  }
}
