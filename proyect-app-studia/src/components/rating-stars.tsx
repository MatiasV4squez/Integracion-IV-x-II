import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { useUI } from '@/hooks/use-ui';

type Props = {
  /** Valor entero de 1 a 5 (BR19). */
  value: number;
  /** Si se entrega, las estrellas son seleccionables. */
  onChange?: (value: number) => void;
  size?: number;
};

export function RatingStars({ value, onChange, size = 20 }: Props) {
  const ui = useUI();

  return (
    <View style={styles.row} accessibilityLabel={`Calificación ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <Txt style={{ fontSize: size, lineHeight: size + 6, color: filled ? ui.star : ui.border }}>★</Txt>
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

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 2 } });
