import { Inject, Injectable } from '@nestjs/common';
import {
  type CambioEstadoCuentaRespuesta,
  USUARIOS_AUTH_CLIENT,
  type UsuariosAuthClient,
} from '../dominio/ports/usuarios-auth-client.js';

@Injectable()
export class ModeracionUsuariosAuthService {
  constructor(
    @Inject(USUARIOS_AUTH_CLIENT)
    private readonly usuariosAuth: UsuariosAuthClient,
  ) {}

  suspenderUsuario(idUsuario: string): Promise<CambioEstadoCuentaRespuesta> {
    return this.usuariosAuth.cambiarEstadoCuenta(idUsuario, 'SUSPENDIDO');
  }

  reactivarUsuario(idUsuario: string): Promise<CambioEstadoCuentaRespuesta> {
    return this.usuariosAuth.cambiarEstadoCuenta(idUsuario, 'ACTIVO');
  }
}
