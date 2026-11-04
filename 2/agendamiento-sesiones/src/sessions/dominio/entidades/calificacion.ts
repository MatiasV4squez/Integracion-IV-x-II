export interface Calificacion {
  id_calificacion: bigint;
  id_sesion: bigint;
  id_evaluador: bigint;
  id_evaluado: bigint;
  puntuacion: number;
  fecha_calificacion: Date;
}
