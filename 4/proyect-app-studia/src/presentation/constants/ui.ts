/** Paleta y medidas (claro / oscuro), alineadas con la web de Tutorías: azul #1467D5, marca #1453AA, bordes #D6E2F2. */
export const UI = {
  light: {
    bg: '#F7F9FC',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF4FF',
    border: '#D6E2F2',
    text: '#172A48',
    muted: '#526785',
    primary: '#1467D5',
    primaryText: '#135AB8',
    primarySoft: '#EDF4FF',
    onPrimary: '#FFFFFF',
    star: '#FF9F12',
    shadow: '0 1px 2px rgba(23, 42, 72, 0.05)',
    navy: '#1453AA',
    navyMuted: '#BFD4F5',
    cyan: '#1979F3',
    cyanBright: '#9CC6FF',
    qr: '#172A48',
    band: '#EDF5FF',
  },
  dark: {
    bg: '#0C1626',
    surface: '#13213A',
    surfaceAlt: '#1A2C4A',
    border: '#24385A',
    text: '#E8F0FB',
    muted: '#9DB0CC',
    primary: '#4C8DF0',
    primaryText: '#8DB8FF',
    primarySoft: '#16305A',
    onPrimary: '#FFFFFF',
    star: '#FFB547',
    shadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
    navy: '#123C82',
    navyMuted: '#9DB0CC',
    cyan: '#2F6FD2',
    cyanBright: '#9CC6FF',
    qr: '#172A48',
    band: '#102542',
  },
} as const;

export type UIColors = { [K in keyof (typeof UI)['light']]: string };

// Radios de la web: botones 11, tarjetas 14, paneles 18.
export const RADIUS = { sm: 9, md: 11, lg: 14, xl: 18, pill: 999 } as const;
