import { Text, type TextProps, type TextStyle } from 'react-native';

import { useUI } from '@/presentation/hooks/use-ui';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label';
type ColorKey = 'text' | 'muted' | 'primary' | 'onPrimary';

// Escala de la web: títulos con interletrado negativo, párrafos de 14 px con interlineado 1.6.
const VARIANTS: Record<Variant, TextStyle> = {
  h1: { fontSize: 26, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
  h2: { fontSize: 21, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 17, lineHeight: 23, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '400' },
  small: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
};

const COLORS = { text: 'text', muted: 'muted', primary: 'primaryText', onPrimary: 'onPrimary' } as const;

export type TxtProps = TextProps & { variant?: Variant; color?: ColorKey };

/** Texto del rediseño: tamaños y colores consistentes, con soporte claro/oscuro. */
export function Txt({ variant = 'body', color = 'text', style, ...rest }: TxtProps) {
  const ui = useUI();
  return <Text style={[VARIANTS[variant], { color: ui[COLORS[color]] }, style]} {...rest} />;
}
