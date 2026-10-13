import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { isTransactionConflict } from '../../../database/transaction-conflict';
import { ErrorSesion } from '../../dominio/errores/error-sesion';
import type { UnidadDeTrabajo, ContextoTransaccion } from '../../aplicacion/puertos/unidad-de-trabajo.puerto';
import { RepositorioSesionesPrisma } from './repositorio-sesiones-prisma';
import { RepositorioDeclaracionesPrisma } from './repositorio-declaraciones-prisma';
import { RepositorioCalificacionesPrisma } from './repositorio-calificaciones-prisma';
import { RepositorioResolucionesPrisma } from './repositorio-resoluciones-prisma';
import { RepositorioEntregasPrisma } from './repositorio-entregas-prisma';
import { RepositorioLiberacionesPrisma } from './repositorio-liberaciones-prisma';
import { RepositorioAvisosModeracionPrisma } from './repositorio-avisos-moderacion-prisma';

export function crearRepositoriosPrisma(
  cliente: Prisma.TransactionClient,
): ContextoTransaccion {
  return {
    sesiones: new RepositorioSesionesPrisma(cliente),
    declaraciones: new RepositorioDeclaracionesPrisma(cliente),
    calificaciones: new RepositorioCalificacionesPrisma(cliente),
    resoluciones: new RepositorioResolucionesPrisma(cliente),
    entregas: new RepositorioEntregasPrisma(cliente),
    liberaciones: new RepositorioLiberacionesPrisma(cliente),
    avisosModeracion: new RepositorioAvisosModeracionPrisma(cliente),
  };
}

export class UnidadDeTrabajoPrisma implements UnidadDeTrabajo {
  constructor(private readonly prisma: PrismaService) {}

  async ejecutar<T>(
    operacion: (contexto: ContextoTransaccion) => Promise<T>,
  ): Promise<T> {
    for (let intento = 1; intento <= 3; intento++) {
      try {
        return await this.prisma.$transaction(
          (transaccion) => operacion(crearRepositoriosPrisma(transaccion)),
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error: unknown) {
        if (!isTransactionConflict(error)) throw error;
        if (intento < 3)
          await new Promise<void>((resolver) =>
            setTimeout(resolver, 50 * intento),
          );
      }
    }
    throw new ErrorSesion(
      'CONFLICTO',
      'Otra operación modificó los datos. Intenta nuevamente.',
    );
  }
}
