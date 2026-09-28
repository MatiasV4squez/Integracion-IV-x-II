import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MOCK_SESSIONS } from '@/mocks/sessions';

/**
 * MENÚ TEMPORAL de vistas previas para revisar las pantallas maquetadas.
 * Se elimina/reemplaza cuando exista la navegación real de la app.
 */
export default function PreviewMenu() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <View>
        <ThemedText type="subtitle" style={styles.title}>
          Studia · Vista previa
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Menú temporal para revisar las pantallas maquetadas.
        </ThemedText>
      </View>

      <MenuItem label="Historial de sesiones" onPress={() => router.push('/historial')} />
      <MenuItem label="Solicitar tutoría" onPress={() => router.push('/solicitud')} />
      <MenuItem
        label="Solicitar tutoría (límite 4/4 alcanzado)"
        onPress={() => router.push({ pathname: '/solicitud', params: { pendientes: '4' } })}
      />

      <ThemedText type="smallBold" style={styles.sectionTitle}>
        Detalle de sesión por estado
      </ThemedText>
      {MOCK_SESSIONS.map((s) => (
        <MenuItem
          key={s.id}
          label={`${s.subject.name} · como ${s.myRole === 'tutee' ? 'Tutee' : 'Tutor'}`}
          badge={<StatusBadge status={s.status} />}
          onPress={() => router.push({ pathname: '/detalle-sesion', params: { id: s.id } })}
        />
      ))}
    </ScreenContainer>
  );
}

function MenuItem({ label, badge, onPress }: { label: string; badge?: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <ThemedView type="backgroundElement" style={styles.item}>
        <ThemedText type="small" style={styles.itemLabel}>
          {label}
        </ThemedText>
        {badge}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 36 },
  sectionTitle: { marginTop: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderRadius: 14,
  },
  itemLabel: { flex: 1 },
});
