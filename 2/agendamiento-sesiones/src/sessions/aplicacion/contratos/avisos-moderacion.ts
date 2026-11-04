import type { ResultadoCierre } from '../../dominio/tipos/estado-sesion';

export type ContenidoAvisoModeracion =
  | {
      tipo: 'CONFLICTO_DETECTADO';
      id_sesion: string;
      id_tutor: string;
      id_tutee: string;
      id_materia: string;
      fecha_conflicto: string;
      declaraciones: Array<{
        id_declaracion: string;
        id_usuario: string;
        resultado_declarado: ResultadoCierre;
        id_usuario_inasistente: string | null;
        fecha_declaracion: string;
      }>;
    }
  | {
      tipo: 'CONFLICTO_RESUELTO';
      id_sesion: string;
      id_resolucion: string;
      id_administrador: string;
      estado_final: ResultadoCierre;
      motivo_resolucion: string;
      observaciones: string | null;
      fecha_resolucion: string;
    };

export interface AvisoModeracion {
  id_aviso: bigint;
  id_sesion: bigint;
  contenido: ContenidoAvisoModeracion;
  fecha_creacion: Date;
  fecha_entrega: Date | null;
}
