import { StyleSheet, Switch, View } from 'react-native';

import { Card } from '@/components/card';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { Txt } from '@/components/txt';
import { useAuthStore } from '@/hooks/use-auth';
import { usePreferences } from '@/hooks/use-preferences';
import { useUI } from '@/hooks/use-ui';
import { preferencesStore } from '@/store';
import type { ThemePreference } from '@/store/create-preferences-store';

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'Sistema' },
  { key: 'light', label: 'Claro' },
  { key: 'dark', label: 'Oscuro' },
];

/** Datos de la cuenta y preferencias guardadas en el dispositivo (AsyncStorage). */
export function PreferencesCard() {
  const ui = useUI();
  const user = useAuthStore((state) => state.user);
  const theme = usePreferences((state) => state.theme);
  const notificationsEnabled = usePreferences((state) => state.notificationsEnabled);

  return (
    <Card>
      <Txt variant="h3">Cuenta y preferencias</Txt>
      {user ? (
        <View>
          <Txt variant="label">{user.name}</Txt>
          <Txt variant="caption" color="muted">
            {user.email} · {user.roles.map((role) => (role === 'tutee' ? 'Tutee' : role === 'tutor' ? 'Tutor' : 'Administrador')).join(' y ')}
          </Txt>
        </View>
      ) : null}

      <View style={styles.block}>
        <Txt variant="label" color="muted">
          Tema
        </Txt>
        <SegmentedTabs options={THEME_OPTIONS} value={theme} onChange={(key) => preferencesStore.getState().setTheme(key)} />
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Txt variant="label">Notificaciones en la app</Txt>
          <Txt variant="caption" color="muted">
            Solicitudes, confirmaciones y recordatorios
          </Txt>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={(value) => preferencesStore.getState().setNotificationsEnabled(value)}
          trackColor={{ false: ui.border, true: ui.primary }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Activar notificaciones en la app"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
});
