import { CorreoDuplicadoError } from '../dominio/correo-duplicado.error';
import { Usuario } from '../dominio/usuario';
import type { UsuarioRepository } from '../dominio/ports/usuario.repository';
import type { PasswordHasher } from '../dominio/ports/password.hasher';
import type { VerificacionRegistro } from '../dominio/ports/verificacion-registro';
import { EmailVerificationError } from '../../verificacion-correo/dominio/email-verification.error';

export interface RegistrarUsuarioInput {
  nombre: string;
  correoInstitucional: string;
  password: string;
}

export interface ResultadoRegistro {
  usuario: Usuario;
  verificacion: 'ENLACE_GENERADO' | 'PENDIENTE_ENVIO';
}

export class RegistrarUsuarioUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly contrasenas: PasswordHasher,
    private readonly verificacion: VerificacionRegistro,
  ) {}

  async ejecutar(datos: RegistrarUsuarioInput): Promise<ResultadoRegistro> {
    const correo = datos.correoInstitucional.trim().toLowerCase();
    if (await this.usuarios.buscarPorCorreo(correo)) {
      throw new CorreoDuplicadoError();
    }
    const passwordHash = await this.contrasenas.generarHash(datos.password);
    const usuario = await this.usuarios.guardar(
      new Usuario(
        null,
        datos.nombre.trim(),
        correo,
        passwordHash,
        'INACTIVO',
        false,
        ['ESTUDIANTE'],
      ),
    );
    if (usuario.id_usuario === null) {
      throw new Error('El usuario guardado no tiene identificador.');
    }
    try {
      await this.verificacion.solicitarVerificacion(
        usuario.id_usuario,
        usuario.correo_institucional,
      );
    } catch (error) {
      // La cuenta ya existe: un fallo de entrega se recupera con el reenvío.
      if (
        error instanceof EmailVerificationError &&
        error.code === 'EMAIL_DELIVERY_FAILED'
      ) {
        return { usuario, verificacion: 'PENDIENTE_ENVIO' };
      }
      throw error;
    }
    return { usuario, verificacion: 'ENLACE_GENERADO' };
  }
}
