import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { useTone } from '@/hooks/use-tone';
import { useUI } from '@/hooks/use-ui';

type Props = { enrolled: number; capacity: number };

/** Cupos del bloque: capacidad máxima y cuántos inscritos lleva. */
export function CapacityMeter({ enrolled, capacity }: Props) {
  const ui = useUI();
  const full = enrolled >= capacity;
  const tone = useTone(full ? 'danger' : enrolled / capacity >= 0.6 ? 'warning' : 'success');

  return (
    <View style={styles.wrap} accessibilityLabel={`Inscritos ${enrolled} de ${capacity}`}>
      <View style={styles.bars}>
        {Array.from({ length: capacity }, (_, i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i < enrolled ? tone.fg : ui.border }]} />
        ))}
      </View>
      <Txt variant="caption" style={{ color: full ? tone.fg : ui.muted }}>
        {full ? 'Completo' : `Inscritos ${enrolled}/${capacity}`}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  bars: { flexDirection: 'row', gap: 3 },
  bar: { flex: 1, height: 5, borderRadius: 3, maxWidth: 28 },
});
