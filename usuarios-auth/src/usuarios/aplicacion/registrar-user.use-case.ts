// usuarios-auth/src/usuarios/aplicacion/registrar-usuario.use-case.ts
import { Injectable, Inject } from '@nestjs/common';
import { Usuario } from '../dominio/usuario';
import { USUARIO_REPOSITORY } from '../dominio/ports/usuario.repository';
import type { UsuarioRepository } from '../dominio/ports/usuario.repository';
import { hash } from 'argon2';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';

@Injectable()
export class RegistrarUsuarioUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async ejecutar(dto: CreateUsuarioDto): Promise<Usuario> {
    const usuarioExistente = await this.usuarioRepository.buscarPorCorreo(dto.correo_institucional);
    if (usuarioExistente) {
      throw new Error('El correo institucional ya está registrado.');
    }

    const hashedPassword = await hash(dto.password_hash);

    const nuevoUsuario = new Usuario(
      null, 
      dto.nombre,
      dto.correo_institucional,
      hashedPassword,
      'ACTIVO',
      false,
      ['ESTUDIANTE']
    );

    return this.usuarioRepository.guardar(nuevoUsuario);
  }
}