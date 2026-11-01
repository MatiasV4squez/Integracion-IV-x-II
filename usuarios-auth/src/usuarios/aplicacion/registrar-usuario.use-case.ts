import { CorreoDuplicadoError } from '../dominio/correo-duplicado.error';
import { Usuario } from '../dominio/usuario';
import type { UsuarioRepository } from '../dominio/ports/usuario.repository';
import type { PasswordHasher } from '../dominio/ports/password.hasher';

export interface RegistrarUsuarioInput {
  nombre: string;
  correoInstitucional: string;
  password: string;
}

export class RegistrarUsuarioUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly contrasenas: PasswordHasher,
  ) {}

  async ejecutar(datos: RegistrarUsuarioInput): Promise<Usuario> {
    if (await this.usuarios.buscarPorCorreo(datos.correoInstitucional)) {
      throw new CorreoDuplicadoError();
    }
    const passwordHash = await this.contrasenas.generarHash(datos.password);
    return this.usuarios.guardar(
      new Usuario(
        null,
        datos.nombre,
        datos.correoInstitucional,
        passwordHash,
        'ACTIVO',
        false,
        ['ESTUDIANTE'],
      ),
    );
  }
}
