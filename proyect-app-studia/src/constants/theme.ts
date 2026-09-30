export const Colors = {
  light: {
    background: '#F4F6FA',
    surface: '#FFFFFF',
    text: '#0F1B2D',
    textMuted: '#7A8699',
    border: '#E4E7EC',
    primary: '#06B6D4',
    primaryDark: '#0891B2',
    primarySoft: '#E0F7FB',
    onPrimary: '#FFFFFF',
    headerStart: '#0B1F3A',
    headerEnd: '#1E3A70',
    headerAccent: '#7DD3FC',
    iconSoft: '#EAF3FD',
    successBg: '#DCFCE7',
    successText: '#15803D',
    warningBg: '#FEF3C7',
    warningText: '#B45309',
    dangerBg: '#FEE2E2',
    dangerText: '#DC2626',
    tabActive: '#0F2A4A',
    tabInactive: '#94A3B8',
  },
  dark: {
    background: '#0B1220',
    surface: '#151D2B',
    text: '#ECEFF4',
    textMuted: '#98A2B3',
    border: '#243044',
    primary: '#22C3E0',
    primaryDark: '#0E93B5',
    primarySoft: '#12303A',
    onPrimary: '#FFFFFF',
    headerStart: '#07152A',
    headerEnd: '#162D57',
    headerAccent: '#7DD3FC',
    iconSoft: '#1B2A40',
    successBg: '#12351F',
    successText: '#4ADE80',
    warningBg: '#3A2A0C',
    warningText: '#FBBF24',
    dangerBg: '#3B1616',
    dangerText: '#F87171',
    tabActive: '#ECEFF4',
    tabInactive: '#64748B',
  },
};

export type ThemeColors = typeof Colors.light;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const MaxContentWidth = 800;
