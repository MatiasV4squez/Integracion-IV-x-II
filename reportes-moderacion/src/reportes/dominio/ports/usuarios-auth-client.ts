export const USUARIOS_AUTH_CLIENT = Symbol('USUARIOS_AUTH_CLIENT');

export type EstadoCuentaModerable = 'SUSPENDIDO' | 'ACTIVO';

export interface CambioEstadoCuentaRespuesta {
  id_usuario: string;
  estado_cuenta: EstadoCuentaModerable;
}

/**
 * Puerto para la administraciÃ³n de cuentas del microservicio Usuarios/Auth.
 * Reportes/ModeraciÃ³n nunca accede directamente a la base de datos de usuarios.
 */
export interface UsuariosAuthClient {
  cambiarEstadoCuenta(
    idUsuario: string,
    estado: EstadoCuentaModerable,
  ): Promise<CambioEstadoCuentaRespuesta>;
}
