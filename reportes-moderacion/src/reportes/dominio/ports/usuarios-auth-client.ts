export const USUARIOS_AUTH_CLIENT = Symbol('USUARIOS_AUTH_CLIENT');

export type EstadoCuentaModerable = 'SUSPENDIDO' | 'ACTIVO';

export interface CambioEstadoCuentaRespuesta {
  id_usuario: string;
  estado_cuenta: EstadoCuentaModerable;
}

export interface UsuariosAuthClient {
  cambiarEstadoCuenta(
    idUsuario: string,
    estado: EstadoCuentaModerable,
  ): Promise<CambioEstadoCuentaRespuesta>;
}
