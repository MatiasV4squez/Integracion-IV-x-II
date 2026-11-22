import {
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  UsuarioJwtGuard,
  usuarioActual,
  type RequestConUsuario,
} from './usuario-jwt.guard.js';
import { HttpSesionAuthClient } from '../../clientes/http-sesion-auth.client.js';

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
  constructor(@Inject(HttpSesionAuthClient) sesiones: HttpSesionAuthClient) {
    super(sesiones);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!(await super.canActivate(context))) return false;

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    if (!usuarioActual(request).roles.includes(ROL_ADMINISTRADOR)) {
      throw rolInsuficiente();
    }
    return true;
  }
}
