import type { Prisma } from '../../../generated/prisma/client';
import type { RepositorioResoluciones } from '../../aplicacion/puertos/repositorio-resoluciones.puerto';

export class RepositorioResolucionesPrisma implements RepositorioResoluciones {
  constructor(private readonly cliente: Prisma.TransactionClient) {}

  registrar(resolucion: Parameters<RepositorioResoluciones['registrar']>[0]) {
    return this.cliente.resolucion_conflicto_sesion.create({
      data: resolucion,
    });
  }
}
