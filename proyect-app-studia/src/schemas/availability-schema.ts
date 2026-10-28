import { z } from 'zod';

import { AVAILABILITY } from '@/constants/app-config';
import { isPast } from '@/utils/date-time';

export type AvailabilitySchemaOptions = {
  /** "Ahora" (ISO). En la app es el reloj simulado de las sesiones. */
  now: string;
  /** Convierte día + hora en una fecha ISO. */
  toIso: (day: string, time: string) => string;
};

/** Publicar un horario como Tutor (RF08): materia, día, hora de inicio (en el futuro) y cupos. */
export function createAvailabilitySchema({ now, toIso }: AvailabilitySchemaOptions) {
  return z
    .object({
      subjectCode: z.string().min(1, 'Elige una materia.'),
      day: z.string().min(1, 'Elige un día.'),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Elige una hora de inicio.'),
      capacity: z
        .number()
        .int('Los cupos deben ser un número entero.')
        .min(AVAILABILITY.MIN_CAPACITY, `Debe haber al menos ${AVAILABILITY.MIN_CAPACITY} cupo.`)
        .max(AVAILABILITY.MAX_CAPACITY, `Máximo ${AVAILABILITY.MAX_CAPACITY} cupos por horario.`),
    })
    .superRefine((value, ctx) => {
      if (!value.day || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.startTime)) return;
      if (isPast(toIso(value.day, value.startTime), now)) {
        ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Ese horario ya pasó. Elige una hora posterior.' });
      }
    });
}

export type AvailabilityForm = z.infer<ReturnType<typeof createAvailabilitySchema>>;
