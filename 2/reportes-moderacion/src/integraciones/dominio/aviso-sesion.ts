export const ORIGEN_AGENDAMIENTO = 'agendamiento-sesiones';
export const VERSION_AVISO_SOPORTADA = 1;
export const TIPO_CONFLICTO_DETECTADO = 'CONFLICTO_DETECTADO';
export const TIPO_CONFLICTO_RESUELTO = 'CONFLICTO_RESUELTO';
export const RESULTADOS_CIERRE_VALIDOS = [
  'COMPLETADA',
  'NO_REALIZADA',
  'INASISTENCIA',
] as const;

export type TipoAvisoSesion =
  | typeof TIPO_CONFLICTO_DETECTADO
  | typeof TIPO_CONFLICTO_RESUELTO;

export type ResultadoCierre = (typeof RESULTADOS_CIERRE_VALIDOS)[number];

export interface DeclaracionCierreAviso {
  id_declaracion: string;
  id_usuario: string;
  resultado_declarado: ResultadoCierre;
  id_usuario_inasistente: string | null;
  fecha_declaracion: string;
}

export interface ContenidoConflictoSesion {
  tipo: typeof TIPO_CONFLICTO_DETECTADO;
  id_sesion: string;
  id_tutor: string;
  id_tutee: string;
  id_materia: string;
  fecha_conflicto: string;
  declaraciones: DeclaracionCierreAviso[];
}

export interface ContenidoResolucionSesion {
  tipo: typeof TIPO_CONFLICTO_RESUELTO;
  id_sesion: string;
  id_resolucion: string;
  id_administrador: string;
  estado_final: ResultadoCierre;
  motivo_resolucion: string;
  observaciones: string | null;
  fecha_resolucion: string;
}

export type ContenidoAvisoSesion =
  | ContenidoConflictoSesion
  | ContenidoResolucionSesion;

export interface AvisoSesion {
  id: number;
  origen: string;
  version: number;
  idAviso: string;
  fechaAviso: Date;
  tipo: string;
  idSesion: bigint;
  datos: ContenidoAvisoSesion;
  creadoEn: Date;
}

export function esResultadoCierreValido(
  value: string,
): value is ResultadoCierre {
  return (RESULTADOS_CIERRE_VALIDOS as readonly string[]).includes(value);
}
