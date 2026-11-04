import { ErrorSesion } from '../../dominio/errores/error-sesion';

const FORMATO_SANTIAGO = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function obtenerFechaLocal(instante: Date): string {
  const partes = FORMATO_SANTIAGO.formatToParts(instante);
  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)!.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}T${valor('hour')}:${valor('minute')}`;
}

function convertirInstante(dia: string, hora: string): Date {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dia) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
  ) {
    throw new ErrorSesion(
      'DEPENDENCIA_NO_DISPONIBLE',
      'Materias-tutores devolvió un horario inválido.',
    );
  }
  const fechaLocal = `${dia}T${hora}`;
  const referencia = Date.parse(`${fechaLocal}:00.000Z`);
  if (
    !Number.isFinite(referencia) ||
    new Date(referencia).toISOString().slice(0, 16) !== fechaLocal
  ) {
    throw new ErrorSesion(
      'DEPENDENCIA_NO_DISPONIBLE',
      'Materias-tutores devolvió una fecha inválida.',
    );
  }
  // Obtiene los posibles offsets a ambos lados de una transición de horario.
  const desplazamientos = new Set<number>();
  for (const horas of [-36, 0, 36]) {
    const muestra = referencia + horas * 60 * 60 * 1000;
    desplazamientos.add(
      Date.parse(`${obtenerFechaLocal(new Date(muestra))}:00.000Z`) - muestra,
    );
  }
  const candidatos = [...desplazamientos]
    .map((desplazamiento) => new Date(referencia - desplazamiento))
    .filter((instante) => obtenerFechaLocal(instante) === fechaLocal);
  if (candidatos.length !== 1) {
    throw new ErrorSesion(
      'DEPENDENCIA_NO_DISPONIBLE',
      'El horario del bloque es ambiguo o no existe en America/Santiago.',
    );
  }
  return candidatos[0];
}

export function convertirHorarioBloque(
  dia: string,
  horaInicio: string,
  horaFin: string,
) {
  const inicio = convertirInstante(dia, horaInicio);
  const fin = convertirInstante(dia, horaFin);
  if (fin <= inicio) {
    throw new ErrorSesion(
      'DEPENDENCIA_NO_DISPONIBLE',
      'El horario de término del bloque debe ser posterior al inicio.',
    );
  }
  return { inicio, fin };
}
