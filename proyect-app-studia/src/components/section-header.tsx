import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';

type Props = { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void };

export function SectionHeader({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Txt variant="h3">{title}</Txt>
        {subtitle ? (
          <Txt variant="small" color="muted">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Txt variant="label" color="primary">
            {actionLabel}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  text: { flex: 1 },
});
