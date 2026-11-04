import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Usuario } from '../../dominio/usuario';
import { CorreoDuplicadoError } from '../../dominio/correo-duplicado.error';
import type {
  DatosPublicosRepository,
  DatosPublicosUsuario,
  UsuarioRepository,
} from '../../dominio/ports/usuario.repository';

const conRoles = {
  roles: { include: { rol: true } },
} satisfies Prisma.UsuarioInclude;
type UsuarioConRoles = Prisma.UsuarioGetPayload<{ include: typeof conRoles }>;

@Injectable()
export class PrismaUsuarioRepository
  implements UsuarioRepository, DatosPublicosRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorIds(ids: bigint[]): Promise<DatosPublicosUsuario[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { id_usuario: { in: ids } },
      select: {
        id_usuario: true,
        nombre: true,
        carrera: true,
        semestre_actual: true,
        biografia: true,
      },
    });
    return usuarios.map((usuario) => ({
      id: usuario.id_usuario.toString(),
      nombre: usuario.nombre,
      carrera: usuario.carrera,
      semestre_actual: usuario.semestre_actual,
      biografia: usuario.biografia,
    }));
  }

  private toDomain(prismaUser: UsuarioConRoles): Usuario {
    return new Usuario(
      prismaUser.id_usuario,
      prismaUser.nombre,
      prismaUser.correo_institucional,
      prismaUser.password_hash,
      prismaUser.estado_cuenta,
      prismaUser.correo_verificado,
      prismaUser.roles.map(({ rol }) => rol.nombre),
      prismaUser.carrera,
      prismaUser.semestre_actual,
      prismaUser.biografia,
      prismaUser.fecha_registro,
    );
  }

  async guardar(usuario: Usuario): Promise<Usuario> {
    try {
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
          roles: {
            create: usuario.roles.map((rolNombre) => ({
              rol: { connect: { nombre: rolNombre } },
            })),
          },
        },
        include: conRoles,
      });
      return this.toDomain(nuevoUsuario);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes('correo_institucional')
      ) {
        throw new CorreoDuplicadoError();
      }
      throw error;
    }
  }

  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const user = await this.prisma.usuario.findUnique({
      where: { correo_institucional: correo },
      include: conRoles,
    });

    return user ? this.toDomain(user) : null;
  }
}
