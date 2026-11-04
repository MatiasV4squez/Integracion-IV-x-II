const FORMATO = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export interface ReferenciaHorario {
  dia: string;
  hora: string;
}

export function horarioEnSantiago(instante: Date): ReferenciaHorario {
  const partes = FORMATO.formatToParts(instante);
  const valor = (tipo: Intl.DateTimeFormatPartTypes): string => partes.find((parte) => parte.type === tipo)!.value;
  return { dia: `${valor('year')}-${valor('month')}-${valor('day')}`, hora: `${valor('hour')}:${valor('minute')}` };
}
