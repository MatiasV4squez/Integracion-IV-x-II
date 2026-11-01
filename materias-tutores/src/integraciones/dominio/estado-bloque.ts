export type EstadoBloqueIntegracion = 'DISPONIBLE' | 'RESERVADO';

export class IntegracionBloqueError extends Error {
  constructor(readonly codigo: 'NO_ENCONTRADO' | 'CONFLICTO', mensaje: string) {
    super(mensaje);
    this.name = 'IntegracionBloqueError';
  }
}

export function estadoAnterior(estado: EstadoBloqueIntegracion): EstadoBloqueIntegracion {
  return estado === 'RESERVADO' ? 'DISPONIBLE' : 'RESERVADO';
}
