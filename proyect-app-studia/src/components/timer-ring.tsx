import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

const TICKS = 60;

type Props = { size?: number; progress: number; color: string; trackColor: string; children?: ReactNode };

/** Anillo de marcas (estilo dial). `progress` va de 0 a 1 y se llena en sentido horario desde arriba. */
export function TimerRing({ size = 128, progress, color, trackColor, children }: Props) {
  const filled = Math.round(Math.min(1, Math.max(0, progress)) * TICKS);

  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: TICKS }, (_, i) => (
        <View key={i} style={[styles.spoke, { width: size, height: size, transform: [{ rotate: `${(360 / TICKS) * i}deg` }] }]}>
          <View style={[styles.tick, { backgroundColor: i < filled ? color : trackColor }]} />
        </View>
      ))}
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  spoke: { position: 'absolute', top: 0, left: 0, alignItems: 'center' },
  tick: { width: 4, height: 13, borderRadius: 2 },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
