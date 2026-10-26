import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Txt } from '@/components/txt';

type Props = {
  icon?: string;
  title: string;
  message?: string;
  /** Siguiente paso sugerido (p. ej. "Buscar tutorías" o "Limpiar filtros"). */
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon = '🗂️', title, message, action }: Props) {
  return (
    <View style={styles.box}>
      <Txt style={styles.icon}>{icon}</Txt>
      <Txt variant="h3">{title}</Txt>
      {message ? (
        <Txt variant="small" color="muted" style={styles.center}>
          {message}
        </Txt>
      ) : null}
      {action ? <AppButton label={action.label} variant="secondary" size="sm" onPress={action.onPress} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 6, paddingVertical: 32, paddingHorizontal: 16 },
  icon: { fontSize: 34, lineHeight: 42 },
  center: { textAlign: 'center' },
  button: { marginTop: 8 },
});
