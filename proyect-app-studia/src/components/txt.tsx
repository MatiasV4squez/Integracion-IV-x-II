import { Text, type TextProps, type TextStyle } from 'react-native';

import { useUI } from '@/hooks/use-ui';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label';
type ColorKey = 'text' | 'muted' | 'primary' | 'onPrimary';

const VARIANTS: Record<Variant, TextStyle> = {
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  h3: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
};

export type TxtProps = TextProps & { variant?: Variant; color?: ColorKey };

/** Texto del rediseño: tamaños y colores consistentes, con soporte claro/oscuro. */
export function Txt({ variant = 'body', color = 'text', style, ...rest }: TxtProps) {
  const ui = useUI();
  return <Text style={[VARIANTS[variant], { color: ui[color] }, style]} {...rest} />;
}
