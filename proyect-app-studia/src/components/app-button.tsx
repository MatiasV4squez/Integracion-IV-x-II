import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ACCENT } from '@/constants/tones';
import { useTheme } from '@/hooks/use-theme';
import { useTone } from '@/hooks/use-tone';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function AppButton({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const theme = useTheme();
  const danger = useTone('danger');

  const backgroundColor =
    variant === 'primary' ? ACCENT : variant === 'danger' ? danger.bg : theme.backgroundSelected;
  const color = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? danger.fg : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48, // área táctil cómoda en móvil
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
