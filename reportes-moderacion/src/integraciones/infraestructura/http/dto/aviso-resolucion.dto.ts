export class AvisoResolucionDto {
  origen: string;
  version: number;
  id_aviso: string;
  fecha_aviso: string;
  tipo: string;
  id_sesion: string;
  id_resolucion: string;
  id_administrador: string;
  estado_final: string;
  motivo_resolucion: string;
  observaciones: string | null;
  fecha_resolucion: string;
}
