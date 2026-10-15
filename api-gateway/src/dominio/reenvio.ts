export const SERVICIOS = [
  'usuarios-auth',
  'materias-tutores',
  'agendamiento-sesiones',
  'reportes-moderacion',
] as const;

export type Servicio = (typeof SERVICIOS)[number];
export type EncabezadosHttp = Record<string, string | string[] | undefined>;

export interface PeticionHttp {
  metodo: string;
  ruta: string;
  encabezados: EncabezadosHttp;
  cuerpo: AsyncIterable<Uint8Array>;
}

export interface PeticionMicroservicio extends PeticionHttp {
  urlBase: string;
  tiempoEsperaMs: number;
}

export interface RespuestaHttp {
  estado: number;
  encabezados: EncabezadosHttp;
  cuerpo: AsyncIterable<Uint8Array>;
}

export type MotivoErrorReenvio = 'SIN_CONFIGURAR' | 'COMUNICACION' | 'TIEMPO_AGOTADO';

// El núcleo expresa el motivo; el adaptador de entrada decide su estado HTTP.
export class ErrorReenvio extends Error {
  constructor(
    readonly motivo: MotivoErrorReenvio,
    readonly servicio?: Servicio,
  ) {
    super(motivo);
    this.name = 'ErrorReenvio';
  }
}
