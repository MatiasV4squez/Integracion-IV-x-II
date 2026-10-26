import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Txt } from '@/components/txt';

type Props = { title?: string; message?: string; onRetry?: () => void };

/** Error al cargar sin datos previos: explica qué pasó y permite reintentar. */
export function ErrorState({ title = 'No pudimos cargar la información', message, onRetry }: Props) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Txt style={styles.icon}>⚠️</Txt>
      <Txt variant="h3" style={styles.center}>
        {title}
      </Txt>
      {message ? (
        <Txt variant="small" color="muted" style={styles.center}>
          {message}
        </Txt>
      ) : null}
      {onRetry ? <AppButton label="Reintentar" variant="secondary" size="sm" onPress={onRetry} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 6, paddingVertical: 32, paddingHorizontal: 16 },
  icon: { fontSize: 34, lineHeight: 42 },
  center: { textAlign: 'center' },
  button: { marginTop: 8 },
});
