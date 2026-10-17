import { ErrorDisponibilidad } from '../errores/error-disponibilidad';

const FORMATO_LOCAL = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function obtenerFechaLocal(instante: Date): string {
  const partes = FORMATO_LOCAL.formatToParts(instante);
  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)!.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}T${valor('hour')}:${valor('minute')}`;
}

function convertirInstante(dia: string, hora: string): Date {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dia) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
  ) {
    throw new ErrorDisponibilidad(
      'ENTRADA_INVALIDA',
      'El día y la hora deben tener formato YYYY-MM-DD y HH:MM.',
    );
  }
  const fechaLocal = `${dia}T${hora}`;
  const referencia = Date.parse(`${fechaLocal}:00.000Z`);
  if (
    !Number.isFinite(referencia) ||
    new Date(referencia).toISOString().slice(0, 16) !== fechaLocal
  ) {
    throw new ErrorDisponibilidad(
      'ENTRADA_INVALIDA',
      'La fecha u hora indicada no es válida.',
    );
  }
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
    throw new ErrorDisponibilidad(
      'ENTRADA_INVALIDA',
      'El horario es ambiguo o no existe en la zona horaria local.',
    );
  }
  return candidatos[0];
}

function sumarDias(dia: string, cantidad: number): string {
  const [anio, mes, diaNumero] = dia.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, diaNumero));
  fecha.setUTCDate(fecha.getUTCDate() + cantidad);
  return fecha.toISOString().slice(0, 10);
}

export function convertirHorario(
  dia: string,
  horaInicio: string,
  horaFin: string,
) {
  const inicio = convertirInstante(dia, horaInicio);
  const fin = convertirInstante(dia, horaFin);
  if (fin <= inicio) {
    throw new ErrorDisponibilidad(
      'ENTRADA_INVALIDA',
      'La hora de término debe ser posterior a la de inicio.',
    );
  }
  return { inicio, fin };
}

export function inicioDelDia(dia: string): Date {
  return convertirInstante(dia, '00:00');
}

export function finDelDia(dia: string): Date {
  return convertirInstante(sumarDias(dia, 1), '00:00');
}

export function obtenerDia(instante: Date): string {
  return obtenerFechaLocal(instante).slice(0, 10);
}

export function obtenerHora(instante: Date): string {
  return obtenerFechaLocal(instante).slice(11, 16);
}
