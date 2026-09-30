import type { ThemeColors } from '@/constants/theme';

export type ReservaStatus = 'completada' | 'cancelada' | 'no-show';

export type Reserva = {
  id: string;
  room: string;
  location: string;
  date: string;
  time: string;
  status: ReservaStatus;
};

// Datos de ejemplo: reemplazar por datos reales cuando exista el backend.
export const RESERVAS_HISTORIAL: Reserva[] = [
  {
    id: '1',
    room: 'Cubículo A-03',
    location: 'Biblioteca Juan Pablo II · Piso 2',
    date: '25 sep',
    time: '10:00 - 12:00',
    status: 'completada',
  },
  {
    id: '2',
    room: 'Cubículo B-07',
    location: 'Edificio Central · Piso 1',
    date: '23 sep',
    time: '15:00 - 16:00',
    status: 'completada',
  },
  {
    id: '3',
    room: 'Sala 204',
    location: 'Facultad de Ingeniería · Piso 2',
    date: '20 sep',
    time: '09:00 - 10:30',
    status: 'cancelada',
  },
  {
    id: '4',
    room: 'Cubículo A-11',
    location: 'Biblioteca Juan Pablo II · Piso 3',
    date: '18 sep',
    time: '14:00 - 15:00',
    status: 'no-show',
  },
  {
    id: '5',
    room: 'Cubículo C-02',
    location: 'Edificio Central · Piso 2',
    date: '15 sep',
    time: '11:00 - 13:00',
    status: 'completada',
  },
];

export function reservaStatusLabel(status: ReservaStatus) {
  return {
    completada: 'Completada',
    cancelada: 'Cancelada',
    'no-show': 'No asistida',
  }[status];
}

export function reservaStatusBadge(status: ReservaStatus, colors: ThemeColors) {
  switch (status) {
    case 'completada':
      return { bg: colors.successBg, text: colors.successText };
    case 'cancelada':
      return { bg: colors.dangerBg, text: colors.dangerText };
    case 'no-show':
      return { bg: colors.warningBg, text: colors.warningText };
  }
}
