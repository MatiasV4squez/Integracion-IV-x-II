import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { STAR } from '@/constants/tones';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Valor entero de 1 a 5 (BR19). */
  value: number;
  /** Si se entrega, las estrellas son seleccionables. */
  onChange?: (value: number) => void;
  size?: number;
};

export function RatingStars({ value, onChange, size = 22 }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row} accessibilityLabel={`Calificación ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <ThemedText style={{ fontSize: size, lineHeight: size + 6, color: filled ? STAR : theme.textSecondary }}>
            {filled ? '★' : '☆'}
          </ThemedText>
        );
        return onChange ? (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
            hitSlop={6}
            onPress={() => onChange(n)}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
});
