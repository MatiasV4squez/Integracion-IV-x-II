import type { ThemeColors } from '@/constants/theme';

export type TutoriaStatus = 'confirmada' | 'pendiente' | 'completada' | 'cancelada';

export type Tutoria = {
  id: string;
  studentName: string;
  subject: string;
  date: string;
  time: string;
  modality: 'Presencial' | 'Virtual';
  location: string;
  status: TutoriaStatus;
  notes: string;
};

// Datos de ejemplo: reemplazar por datos reales cuando exista el backend.
export const TUTORIAS: Tutoria[] = [
  {
    id: '1',
    studentName: 'Camila Rojas',
    subject: 'Cálculo I',
    date: 'Hoy',
    time: '14:00 - 15:00',
    modality: 'Presencial',
    location: 'Biblioteca Juan Pablo II · Cubículo A-03',
    status: 'confirmada',
    notes: 'Repasar límites y derivadas antes del certamen del jueves.',
  },
  {
    id: '2',
    studentName: 'Benjamín Soto',
    subject: 'Programación I',
    date: 'Hoy',
    time: '16:30 - 17:30',
    modality: 'Virtual',
    location: 'Videollamada',
    status: 'pendiente',
    notes: 'Dudas con recursividad y estructuras de control.',
  },
  {
    id: '3',
    studentName: 'Valentina Muñoz',
    subject: 'Álgebra Lineal',
    date: 'Mañana',
    time: '10:00 - 11:00',
    modality: 'Presencial',
    location: 'Facultad de Ingeniería · Sala 204',
    status: 'confirmada',
    notes: 'Traer ejercicios de espacios vectoriales resueltos.',
  },
  {
    id: '4',
    studentName: 'Ignacio Pérez',
    subject: 'Física I',
    date: '24 sep',
    time: '11:00 - 12:00',
    modality: 'Presencial',
    location: 'Edificio Central · Cubículo B-12',
    status: 'completada',
    notes: 'Cinemática y leyes de Newton.',
  },
  {
    id: '5',
    studentName: 'Florencia Díaz',
    subject: 'Cálculo II',
    date: '22 sep',
    time: '09:00 - 10:00',
    modality: 'Virtual',
    location: 'Videollamada',
    status: 'cancelada',
    notes: 'La estudiante canceló por motivos de salud.',
  },
];

export function findTutoria(id: string | undefined) {
  return TUTORIAS.find((tutoria) => tutoria.id === id);
}

export function statusLabel(status: TutoriaStatus) {
  return {
    confirmada: 'Confirmada',
    pendiente: 'Pendiente',
    completada: 'Completada',
    cancelada: 'Cancelada',
  }[status];
}

export function statusBadge(status: TutoriaStatus, colors: ThemeColors) {
  switch (status) {
    case 'confirmada':
      return { bg: colors.successBg, text: colors.successText };
    case 'pendiente':
      return { bg: colors.warningBg, text: colors.warningText };
    case 'cancelada':
      return { bg: colors.dangerBg, text: colors.dangerText };
    case 'completada':
      return { bg: colors.iconSoft, text: colors.textMuted };
  }
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
