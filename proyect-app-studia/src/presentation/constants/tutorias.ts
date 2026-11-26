import type { Tutoria, TutoriaStatus } from '@/application/ports/repositories';
import type { ThemeColors } from '@/presentation/constants/theme';

export type { Tutoria, TutoriaStatus };

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
