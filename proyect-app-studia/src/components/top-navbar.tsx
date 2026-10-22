import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/txt';
import { MaxContentWidth } from '@/constants/theme';
import { MAX_PENDING_REQUESTS } from '@/utils/session-machine';
import { useUI } from '@/hooks/use-ui';
import { useSessions } from '@/state/sessions-context';

type TabKey = 'historial' | 'solicitud' | 'detalle';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'historial', label: 'Historial', icon: '🕘' },
  { key: 'solicitud', label: 'Solicitar', icon: '➕' },
  { key: 'detalle', label: 'Detalle', icon: '📄' },
];

function activeTab(pathname: string): TabKey | null {
  if (pathname.startsWith('/historial')) return 'historial';
  if (pathname.startsWith('/solicitud') || pathname.startsWith('/tutor')) return 'solicitud';
  if (pathname.startsWith('/detalle-sesion')) return 'detalle';
  return null;
}

/** Barra superior con la marca, el contador de solicitudes pendientes y las pantallas principales. */
export function TopNavbar() {
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { pendingCount, lastViewedId } = useSessions();
  const active = activeTab(pathname);

  const go = (key: TabKey) => {
    if (key === 'historial') router.navigate('/historial');
    else if (key === 'solicitud') router.navigate('/solicitud');
    else router.navigate(lastViewedId ? { pathname: '/detalle-sesion', params: { id: lastViewedId } } : '/detalle-sesion');
  };

  const limitReached = pendingCount >= MAX_PENDING_REQUESTS;

  return (
    <View style={[styles.bar, { backgroundColor: ui.navy, paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: ui.cyanBright }]}>
              <Txt variant="h3" style={{ color: ui.navy }}>
                S
              </Txt>
            </View>
            <View>
              <Txt variant="h3" style={{ color: '#FFFFFF' }}>
                Studia
              </Txt>
              <Txt variant="caption" style={{ color: ui.navyMuted }}>
                Tutorías entre pares
              </Txt>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${pendingCount} de ${MAX_PENDING_REQUESTS} solicitudes pendientes`}
            onPress={() => router.navigate('/solicitud')}
            style={[styles.pill, { backgroundColor: limitReached ? '#FDE4E4' : 'rgba(255,255,255,0.12)' }]}>
            <Txt variant="label" style={{ color: limitReached ? '#A4262C' : '#FFFFFF' }}>
              📨 {pendingCount}/{MAX_PENDING_REQUESTS} pendientes
            </Txt>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const isActive = tab.key === active;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                onPress={() => go(tab.key)}
                style={[styles.tab, { borderColor: isActive ? ui.cyanBright : 'transparent' }]}>
                <Txt variant="label" style={{ color: isActive ? '#FFFFFF' : ui.navyMuted }}>
                  {tab.icon} {tab.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {},
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderBottomWidth: 3 },
});
