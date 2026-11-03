import type { DisponibilidadRepository } from '@/application/ports/repositories';
import { santiagoToIso } from '@/shared/santiago-time';

import { api, SERVICIOS } from './http-client';

type BloquePropioApi = { idBloque: string; dia: string; horaInicio: string; horaFin: string; estadoBloque: string };

const BASE = `${SERVICIOS.materias}/disponibilidad/bloques`;

/** Adaptador del puerto DisponibilidadRepository: bloques propios del tutor en materias-tutores (requiere rol TUTOR). */
export function createHttpDisponibilidadRepository(): DisponibilidadRepository {
  return {
    async misBloques(signal) {
      const bloques = await api.get<BloquePropioApi[]>(BASE, undefined, signal);
      return bloques
        .filter((b) => b.estadoBloque !== 'INACTIVO')
        .map((b) => ({
          id: b.idBloque,
          // Los bloques del micro no están ligados a una materia: valen para todas las habilitadas.
          subjectCode: '',
          startsAt: santiagoToIso(b.dia, b.horaInicio),
          endsAt: santiagoToIso(b.dia, b.horaFin),
          capacity: 1,
          enrolled: b.estadoBloque === 'RESERVADO' ? 1 : 0,
        }));
    },
    async publicar(bloque) {
      await api.post(BASE, bloque);
    },
    async actualizar(id, bloque) {
      await api.patch(`${BASE}/${encodeURIComponent(id)}`, bloque);
    },
    async desactivar(id) {
      await api.delete(`${BASE}/${encodeURIComponent(id)}`);
    },
  };
}
