import { Pressable, StyleSheet } from 'react-native';

import { Txt } from '@/presentation/components/txt';
import { RADIUS } from '@/presentation/constants/ui';
import { useUI } from '@/presentation/hooks/use-ui';

type Props = { label: string; selected: boolean; onPress: () => void; count?: number };

export function FilterChip({ label, selected, onPress, count }: Props) {
  const ui = useUI();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? ui.primary : ui.surface, borderColor: selected ? ui.primary : ui.border },
      ]}>
      <Txt variant="label" style={{ color: selected ? ui.onPrimary : ui.text }}>
        {label}
        {count !== undefined ? `  ${count}` : ''}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, minHeight: 36, justifyContent: 'center' },
});
