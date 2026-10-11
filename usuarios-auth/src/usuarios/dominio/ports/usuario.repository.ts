import { Usuario } from '../usuario';

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');

export interface UsuarioRepository {
  guardar(usuario: Usuario): Promise<Usuario>;
  buscarPorCorreo(correo: string): Promise<Usuario | null>;
  buscarPorId(id: bigint): Promise<Usuario | null>;
  actualizar(usuario: Usuario): Promise<Usuario>;
}