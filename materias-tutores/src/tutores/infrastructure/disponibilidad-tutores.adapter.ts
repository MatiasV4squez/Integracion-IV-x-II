import { Injectable } from '@nestjs/common';
import { DisponibilidadService } from '../../disponibilidad/disponibilidad.service.js';
import type { HorarioDisponible } from '../application/models/horario-disponible.js';
import type { DisponibilidadTutoresPort } from '../application/ports/disponibilidad-tutores.port.js';

@Injectable()
export class DisponibilidadTutoresAdapter implements DisponibilidadTutoresPort {
  constructor(private readonly disponibilidad: DisponibilidadService) {}

  async consultarPorTutores(idsTutores: string[]): Promise<Map<string, HorarioDisponible[]>> {
    const horariosPorTutor = new Map<string, HorarioDisponible[]>();
    for (const idTutor of new Set(idsTutores)) {
      const bloques = await this.disponibilidad.consultarDisponibilidadTutor(BigInt(idTutor));
      horariosPorTutor.set(
        idTutor,
        bloques.map(({ idBloque, dia, horaInicio, horaFin }) => ({
          idBloque,
          dia,
          horaInicio,
          horaFin,
        })),
      );
    }
    return horariosPorTutor;
  }
}
