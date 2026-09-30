import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';

type Props = { icon?: string; title: string; message?: string };

export function EmptyState({ icon = '🗂️', title, message }: Props) {
  return (
    <View style={styles.box}>
      <Txt style={styles.icon}>{icon}</Txt>
      <Txt variant="h3">{title}</Txt>
      {message ? (
        <Txt variant="small" color="muted" style={styles.center}>
          {message}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 6, paddingVertical: 32, paddingHorizontal: 16 },
  icon: { fontSize: 34, lineHeight: 42 },
  center: { textAlign: 'center' },
});
