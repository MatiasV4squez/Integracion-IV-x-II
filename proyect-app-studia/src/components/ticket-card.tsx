import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { RADIUS } from '@/constants/ui';
import { useUI } from '@/hooks/use-ui';

type Props = {
  overline: string;
  title: string;
  subtitle?: string;
  chipLabel: string;
  chipValue: string;
  columns: { label: string; value: string; flex?: number }[];
};

/** Tarjeta cian del ticket: materia, chip de rol y fila de datos (lugar, inicio, término). */
export function TicketCard({ overline, title, subtitle, chipLabel, chipValue, columns }: Props) {
  const ui = useUI();

  return (
    <View style={[styles.card, { backgroundColor: ui.cyan, boxShadow: ui.shadow }]}>
      <View style={styles.blobA} />
      <View style={styles.blobB} />

      <View style={styles.top}>
        <View style={styles.flex}>
          <Txt variant="caption" style={styles.overline}>
            {overline.toUpperCase()}
          </Txt>
          <Txt variant="h1" style={styles.title}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt variant="small" style={styles.subtitle}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        <View style={styles.chip}>
          <Txt variant="caption" style={styles.chipLabel}>
            {chipLabel.toUpperCase()}
          </Txt>
          <Txt variant="h2" style={styles.chipValue}>
            {chipValue}
          </Txt>
        </View>
      </View>

      <View style={styles.cols}>
        {columns.map((c) => (
          <View key={c.label} style={{ flex: c.flex ?? 1 }}>
            <Txt variant="caption" style={styles.colLabel}>
              {c.label.toUpperCase()}
            </Txt>
            <Txt variant="h3" style={styles.colValue} numberOfLines={3}>
              {c.value}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.xl, padding: 20, gap: 22, overflow: 'hidden' },
  blobA: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -50, top: -70, backgroundColor: 'rgba(255,255,255,0.12)' },
  blobB: { position: 'absolute', width: 150, height: 150, borderRadius: 75, left: -40, bottom: -80, backgroundColor: 'rgba(14,36,64,0.10)' },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  overline: { color: 'rgba(255,255,255,0.85)', letterSpacing: 1.2, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 28, lineHeight: 34, marginTop: 2 },
  subtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  chip: { minWidth: 64, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)' },
  chipLabel: { color: 'rgba(255,255,255,0.9)', letterSpacing: 1, fontSize: 10 },
  chipValue: { color: '#FFFFFF', fontSize: 18 },
  cols: { flexDirection: 'row', gap: 14 },
  colLabel: { color: 'rgba(255,255,255,0.8)', letterSpacing: 1, fontSize: 10, marginBottom: 2 },
  colValue: { color: '#FFFFFF', fontSize: 14, lineHeight: 19 },
});
