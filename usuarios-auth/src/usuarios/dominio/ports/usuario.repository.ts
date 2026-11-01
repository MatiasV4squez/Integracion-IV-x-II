import { Usuario } from '../usuario';

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');
export const DATOS_PUBLICOS_REPOSITORY = Symbol('DATOS_PUBLICOS_REPOSITORY');

export interface DatosPublicosUsuario {
  id: string;
  nombre: string;
  carrera: string | null;
  semestre_actual: number | null;
  biografia: string | null;
}

export interface DatosPublicosRepository {
  buscarPorIds(ids: bigint[]): Promise<DatosPublicosUsuario[]>;
}

export interface UsuarioRepository {
  guardar(usuario: Usuario): Promise<Usuario>;
  buscarPorCorreo(correo: string): Promise<Usuario | null>;
  buscarPorId(id: bigint): Promise<Usuario | null>;
  actualizar(usuario: Usuario): Promise<Usuario>;
}
