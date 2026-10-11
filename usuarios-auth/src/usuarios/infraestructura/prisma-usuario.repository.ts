import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Usuario } from '../dominio/usuario';
import { UsuarioRepository } from '../dominio/ports/usuario.repository';

@Injectable()
export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Mapeador: Traduce lo que devuelve Prisma a nuestra Entidad Pura de Dominio
  private toDomain(prismaUser: any): Usuario {
    return new Usuario(
      prismaUser.id_usuario,
      prismaUser.nombre,
      prismaUser.correo_institucional,
      prismaUser.password_hash,
      prismaUser.estado_cuenta,
      prismaUser.correo_verificado,
      prismaUser.roles ? prismaUser.roles.map((r: any) => r.rol.nombre) : [],
      prismaUser.carrera,
      prismaUser.semestre_actual,
      prismaUser.biografia,
      prismaUser.fecha_registro,
    );
  }

  async guardar(usuario: Usuario): Promise<Usuario> {
    const nuevoUsuario = await this.prisma.usuario.create({
      data: {
        nombre: usuario.nombre,
        correo_institucional: usuario.correo_institucional,
        password_hash: usuario.password_hash,
        estado_cuenta: usuario.estado_cuenta,
        correo_verificado: usuario.correo_verificado,
        carrera: usuario.carrera,
        semestre_actual: usuario.semestre_actual,
        biografia: usuario.biografia,
        // Conectamos el rol asignado (ej. 'ESTUDIANTE')
        roles: {
          create: usuario.roles.map(rolNombre => ({
            rol: { connect: { nombre: rolNombre } }
          }))
        }
      },
      include: { roles: { include: { rol: true } } }
    });
    
    return this.toDomain(nuevoUsuario);
  }

  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const user = await this.prisma.usuario.findUnique({
      where: { correo_institucional: correo },
      include: { roles: { include: { rol: true } } }
    });
    
    return user ? this.toDomain(user) : null;
  }

  async buscarPorId(id: bigint): Promise<Usuario | null> {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: id },
      include: { roles: { include: { rol: true } } }
    });
    
    return user ? this.toDomain(user) : null;
  }

  async actualizar(usuario: Usuario): Promise<Usuario> {
    const userActualizado = await this.prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario! },
      data: {
        estado_cuenta: usuario.estado_cuenta,
        correo_verificado: usuario.correo_verificado,
        carrera: usuario.carrera,
        semestre_actual: usuario.semestre_actual,
        biografia: usuario.biografia,
      },
      include: { roles: { include: { rol: true } } }
    });
    
    return this.toDomain(userActualizado);
  }
}