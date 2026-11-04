import { Injectable } from '@nestjs/common';
import { ConsultarDisponibilidadTutorUseCase } from '../../disponibilidad/aplicacion/consultar-disponibilidad-tutor.use-case.js';
import type { HorarioDisponible } from '../aplicacion/modelos/horario-disponible.js';
import type { DisponibilidadTutoresPort } from '../aplicacion/puertos/disponibilidad-tutores.port.js';

@Injectable()
export class DisponibilidadTutoresAdapter implements DisponibilidadTutoresPort {
  constructor(private readonly disponibilidad: ConsultarDisponibilidadTutorUseCase) {}

  async consultarPorTutores(idsTutores: string[]): Promise<Map<string, HorarioDisponible[]>> {
    const horariosPorTutor = new Map<string, HorarioDisponible[]>();
    for (const idTutor of new Set(idsTutores)) {
      const bloques = await this.disponibilidad.ejecutar(BigInt(idTutor));
      horariosPorTutor.set(
        idTutor,
        bloques.map(({ idBloque, dia, horaInicio, horaFin }) => ({
          idBloque: idBloque.toString(),
          dia,
          horaInicio,
          horaFin,
        })),
      );
    }
    return horariosPorTutor;
  }
}
