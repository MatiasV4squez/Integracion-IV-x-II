import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { initials } from '@/utils/format';

const PALETTE = [
  { bg: '#DCEBFF', fg: '#0B4FB3' },
  { bg: '#E3F6E8', fg: '#17693A' },
  { bg: '#FFEBD6', fg: '#9A4F06' },
  { bg: '#F3E5FB', fg: '#7A2A9E' },
  { bg: '#FDE4E8', fg: '#A4243B' },
];

function pick(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const { bg, fg } = pick(name);
  return (
    <View
      accessibilityLabel={`Avatar de ${name}`}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Txt variant="label" style={{ color: fg, fontSize: Math.round(size * 0.36) }}>
        {initials(name)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({ circle: { alignItems: 'center', justifyContent: 'center' } });
