import type { DeclaracionCierreAviso } from '../../../dominio/aviso-sesion.js';

export class AvisoConflictoDto {
  origen: string;
  version: number;
  id_aviso: string;
  fecha_aviso: string;
  tipo: string;
  id_sesion: string;
  id_tutor: string;
  id_tutee: string;
  id_materia: string;
  fecha_conflicto: string;
  declaraciones: DeclaracionCierreAviso[];
}
