import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Txt } from '@/components/txt';
import { RADIUS } from '@/constants/ui';
import { useTone } from '@/hooks/use-tone';
import { useUI } from '@/hooks/use-ui';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ label, onPress, variant = 'primary', size = 'md', disabled = false, style }: Props) {
  const ui = useUI();
  const danger = useTone('danger');

  const palette = {
    primary: { bg: ui.primary, fg: ui.onPrimary, border: ui.primary },
    secondary: { bg: ui.surface, fg: ui.text, border: ui.border },
    danger: { bg: danger.bg, fg: danger.fg, border: danger.bg },
    ghost: { bg: 'transparent', fg: ui.primary, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}>
      <Txt variant="label" style={{ color: palette.fg }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  md: { minHeight: 48 },
  sm: { minHeight: 36, paddingHorizontal: 12 },
});
