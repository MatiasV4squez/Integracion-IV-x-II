export interface Postulacion {
  idPostulacion: bigint;
  idUsuario: bigint;
  idMateria: bigint;
  idAdministradorRevision: bigint | null;
  certificadoRef: string;
  certificadoNombre: string;
  certificadoTipo: string;
  notaAcreditada: number | null;
  estado: string;
  fechaPostulacion: Date;
  fechaRevision: Date | null;
  motivoRechazo: string | null;
}

export class PostulacionesError extends Error {
  constructor(readonly codigo: 'ENTRADA_INVALIDA' | 'NO_ENCONTRADO' | 'CONFLICTO' | 'NO_DISPONIBLE', mensaje: string) {
    super(mensaje);
    this.name = 'PostulacionesError';
  }
}

export function validarNotaAcreditada(nota: number): void {
  if (!Number.isFinite(nota) || nota < 5 || nota > 7 || Math.round(nota * 10) !== nota * 10) {
    throw new PostulacionesError('CONFLICTO', 'La nota acreditada debe estar entre 5.0 y 7.0, con un decimal');
  }
}
