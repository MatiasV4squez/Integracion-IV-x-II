import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ACCENT } from '@/constants/tones';
import { useTheme } from '@/hooks/use-theme';

type Props = { label: string; selected: boolean; onPress: () => void };

export function FilterChip({ label, selected, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? ACCENT : theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
});
