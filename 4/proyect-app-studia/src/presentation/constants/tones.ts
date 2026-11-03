export type Tone = 'warning' | 'info' | 'success' | 'danger' | 'neutral' | 'alert';

export const TONES = {
  light: {
    warning: { bg: '#FFF4D6', fg: '#8A5A00' },
    info: { bg: '#EDF4FF', fg: '#135AB8' },
    success: { bg: '#DDF5E5', fg: '#17693A' },
    danger: { bg: '#FDE4E4', fg: '#A4262C' },
    neutral: { bg: '#ECEDEF', fg: '#4B4F56' },
    alert: { bg: '#F3E5FB', fg: '#7A2A9E' },
  },
  dark: {
    warning: { bg: '#3A2E10', fg: '#F5CB6B' },
    info: { bg: '#10294A', fg: '#8FC1FF' },
    success: { bg: '#123222', fg: '#7FD9A3' },
    danger: { bg: '#3F1A1C', fg: '#FF9A9F' },
    neutral: { bg: '#2A2C31', fg: '#B0B4BA' },
    alert: { bg: '#331B40', fg: '#DDA6F5' },
  },
} as const satisfies Record<'light' | 'dark', Record<Tone, { bg: string; fg: string }>>;
