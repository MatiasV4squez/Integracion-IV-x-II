import type { BloqueHorario } from '../../dominio/bloque-horario.js';
import type { BloqueDisponibilidadResponseDto } from './dto/bloque-disponibilidad.response.dto.js';

export function presentarBloque(bloque: BloqueHorario): BloqueDisponibilidadResponseDto {
  return { idBloque: bloque.idBloque.toString(), dia: bloque.dia, horaInicio: bloque.horaInicio, horaFin: bloque.horaFin, estadoBloque: bloque.estadoBloque };
}
