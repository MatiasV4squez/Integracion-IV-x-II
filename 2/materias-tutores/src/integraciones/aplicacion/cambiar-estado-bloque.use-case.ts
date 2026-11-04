import { estadoAnterior, IntegracionBloqueError, type EstadoBloqueIntegracion } from '../dominio/estado-bloque.js';
import type { BloquesIntegracionRepository } from './puertos/bloques-integracion.repository.js';

export class CambiarEstadoBloqueUseCase {
  constructor(private readonly bloques: BloquesIntegracionRepository) {}

  async ejecutar(idBloque: bigint, estado: EstadoBloqueIntegracion) {
    const actual = await this.bloques.buscarEstado(idBloque);
    if (actual === null) throw new IntegracionBloqueError('NO_ENCONTRADO', 'Bloque no encontrado');
    if (actual === estado) return { idBloque, estadoBloque: estado };
    const actualizado = await this.bloques.cambiarSiEstado(idBloque, estadoAnterior(estado), estado);
    if (!actualizado && await this.bloques.buscarEstado(idBloque) !== estado) {
      throw new IntegracionBloqueError('CONFLICTO', 'El bloque cambió o no permite esta transición');
    }
    return { idBloque, estadoBloque: estado };
  }
}
