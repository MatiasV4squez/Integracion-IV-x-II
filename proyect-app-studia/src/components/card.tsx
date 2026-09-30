import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { RADIUS } from '@/constants/ui';
import { useUI } from '@/hooks/use-ui';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Resalta la tarjeta con el color primario (elemento seleccionado). */
  selected?: boolean;
  accessibilityLabel?: string;
};

export function Card({ children, style, onPress, selected = false, accessibilityLabel }: Props) {
  const ui = useUI();
  const base: ViewStyle = {
    backgroundColor: ui.surface,
    borderColor: selected ? ui.primary : ui.border,
    borderWidth: selected ? 2 : 1,
    boxShadow: ui.shadow,
  };

  if (!onPress) return <View style={[styles.card, base, style]}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, base, { opacity: pressed ? 0.92 : 1 }, style]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, padding: 16, gap: 10 },
});
