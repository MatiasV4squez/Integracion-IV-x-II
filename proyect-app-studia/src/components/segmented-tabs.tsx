import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { RADIUS } from '@/constants/ui';
import { useUI } from '@/hooks/use-ui';

type Props<T extends string> = { options: { key: T; label: string }[]; value: T; onChange: (key: T) => void };

export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  const ui = useUI();

  return (
    <View style={[styles.row, { backgroundColor: ui.surfaceAlt }]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.key)}
            style={[styles.tab, active && { backgroundColor: ui.surface, boxShadow: ui.shadow }]}>
            <Txt variant="label" style={{ color: active ? ui.primary : ui.muted }}>
              {opt.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', padding: 4, borderRadius: RADIUS.md, gap: 4 },
  tab: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm },
});
