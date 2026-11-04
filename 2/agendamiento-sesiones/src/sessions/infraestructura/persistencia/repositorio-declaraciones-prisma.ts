import type { Prisma } from '../../../generated/prisma/client';
import type { DeclaracionCierre } from '../../dominio/entidades/declaracion-cierre';
import type { RepositorioDeclaraciones } from '../../aplicacion/puertos/repositorio-declaraciones.puerto';

export class RepositorioDeclaracionesPrisma implements RepositorioDeclaraciones {
  constructor(private readonly cliente: Prisma.TransactionClient) {}

  async registrarSiNoExiste(
    declaracion: Omit<
      DeclaracionCierre,
      'id_declaracion' | 'fecha_declaracion'
    >,
  ): Promise<boolean> {
    const resultado = await this.cliente.declaracion_cierre.createMany({
      data: [declaracion],
      skipDuplicates: true,
    });
    return resultado.count === 1;
  }

  consultarPorSesion(idSesion: bigint) {
    return this.cliente.declaracion_cierre.findMany({
      where: { id_sesion: idSesion },
      orderBy: { fecha_declaracion: 'asc' },
    });
  }
}
