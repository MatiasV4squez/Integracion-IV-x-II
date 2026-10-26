import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { useUI } from '@/hooks/use-ui';

type Props = { message?: string };

/** Estado de carga inicial (aún no hay datos que mostrar). */
export function LoadingState({ message = 'Cargando…' }: Props) {
  const ui = useUI();
  return (
    <View style={styles.box} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={ui.primary} />
      <Txt variant="small" color="muted">
        {message}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 32 },
});
