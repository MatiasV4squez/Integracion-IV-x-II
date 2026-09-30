import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { RADIUS } from '@/constants/ui';
import { useUI } from '@/hooks/use-ui';

type Props = { value: string; label: string };

export function StatTile({ value, label }: Props) {
  const ui = useUI();
  return (
    <View style={[styles.tile, { backgroundColor: ui.surface, borderColor: ui.border, boxShadow: ui.shadow }]}>
      <Txt variant="h2">{value}</Txt>
      <Txt variant="caption" color="muted" numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 90, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, gap: 2 },
});
