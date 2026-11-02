/** Paleta tomada de la web de Tutorías (rama Web): azul #1467D5 sobre fondo #F7F9FC, texto #172A48. */
export const Colors = {
  light: {
    background: '#F7F9FC',
    surface: '#FFFFFF',
    text: '#172A48',
    textMuted: '#526785',
    border: '#D6E2F2',
    primary: '#1467D5',
    primaryDark: '#1056B4',
    primarySoft: '#EDF4FF',
    onPrimary: '#FFFFFF',
    headerStart: '#1979F3',
    headerEnd: '#1649AD',
    headerAccent: '#FFE29A',
    avatar: '#FF9F12',
    onAvatar: '#172A48',
    iconSoft: '#EDF4FF',
    successBg: '#DDF5E5',
    successText: '#17693A',
    warningBg: '#FFF4D6',
    warningText: '#8A5A00',
    dangerBg: '#FDE4E4',
    dangerText: '#A4262C',
    tabActive: '#1467D5',
    tabInactive: '#8A9BB5',
  },
  dark: {
    background: '#0C1626',
    surface: '#13213A',
    text: '#E8F0FB',
    textMuted: '#9DB0CC',
    border: '#24385A',
    primary: '#4C8DF0',
    primaryDark: '#2F6FD2',
    primarySoft: '#16305A',
    onPrimary: '#FFFFFF',
    headerStart: '#1C5FC4',
    headerEnd: '#123C82',
    headerAccent: '#FFE29A',
    avatar: '#FF9F12',
    onAvatar: '#172A48',
    iconSoft: '#16305A',
    successBg: '#123222',
    successText: '#7FD9A3',
    warningBg: '#3A2E10',
    warningText: '#F5CB6B',
    dangerBg: '#3F1A1C',
    dangerText: '#FF9A9F',
    tabActive: '#7FB0FF',
    tabInactive: '#6B7F9E',
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

// Mismos radios que la web: botones 11, tarjetas 14, paneles destacados 18.
export const Radius = {
  sm: 9,
  md: 11,
  lg: 14,
  xl: 18,
  full: 999,
};

export const MaxContentWidth = 800;
