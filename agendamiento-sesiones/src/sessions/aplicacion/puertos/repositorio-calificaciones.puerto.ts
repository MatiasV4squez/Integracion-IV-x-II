import type { Calificacion } from '../../dominio/entidades/calificacion';

export interface RepositorioCalificaciones {
  registrarSiNoExiste(
    calificacion: Omit<Calificacion, 'id_calificacion' | 'fecha_calificacion'>,
  ): Promise<boolean>;
  buscarPorEvaluador(
    idSesion: bigint,
    idEvaluador: bigint,
  ): Promise<Calificacion>;
  resumirNotasComoTutor(
    idTutor: bigint,
  ): Promise<{ cantidad: number; promedio: number | null }>;
}
