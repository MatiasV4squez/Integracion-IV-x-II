import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  ResultadoAsignarTutor,
  RolesRepository,
} from '../../dominio/auth.ports';

@Injectable()
export class PrismaRolesRepository implements RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  asignarTutor(idUsuario: bigint): Promise<ResultadoAsignarTutor> {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({
        where: { id_usuario: idUsuario },
        select: { id_usuario: true },
      });
      if (!usuario) return 'USUARIO_NO_ENCONTRADO';
      const rol = await tx.rol.findUnique({
        where: { nombre: 'TUTOR' },
        select: { id_rol: true },
      });
      if (!rol) return 'ROL_NO_CONFIGURADO';
      // ON CONFLICT DO NOTHING evita duplicados incluso entre peticiones concurrentes.
      await tx.usuarioRol.createMany({
        data: [{ id_usuario: idUsuario, id_rol: rol.id_rol }],
        skipDuplicates: true,
      });
      return 'ASIGNADO';
    });
  }
}
