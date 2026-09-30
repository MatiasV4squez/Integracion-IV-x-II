/** Paleta y medidas del rediseño (claro / oscuro). Inspirada en el ticket digital del Figma: azul marino + cian. */
export const UI = {
  light: {
    bg: '#F3F6FA',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF2F7',
    border: '#E1E8F0',
    text: '#0E2440',
    muted: '#5B6B80',
    primary: '#0E7490',
    primarySoft: '#DFF3F8',
    onPrimary: '#FFFFFF',
    star: '#F5A524',
    shadow: '0 4px 16px rgba(14, 36, 64, 0.08)',
    navy: '#0E2440',
    navyMuted: '#9FB3CC',
    cyan: '#0BA5C9',
    cyanBright: '#22D3EE',
    qr: '#132743',
  },
  dark: {
    bg: '#08111F',
    surface: '#0F1B2E',
    surfaceAlt: '#16253C',
    border: '#22344F',
    text: '#EAF1F8',
    muted: '#8FA3BC',
    primary: '#38C7E8',
    primarySoft: '#0F2E3D',
    onPrimary: '#062033',
    star: '#FBBF24',
    shadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    navy: '#0A1A2F',
    navyMuted: '#8FA3BC',
    cyan: '#0A8EAE',
    cyanBright: '#22D3EE',
    qr: '#132743',
  },
} as const;

export type UIColors = { [K in keyof (typeof UI)['light']]: string };

export const RADIUS = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 } as const;
