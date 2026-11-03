import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiEnabled } from '@/di/container';
import { KeyboardSafe, keyboardScrollProps } from '@/presentation/components/keyboard-safe';
import { Txt } from '@/presentation/components/txt';
import { APP_NAME } from '@/shared/app-config';
import { useTheme } from '@/presentation/hooks/use-theme';
import { useUI } from '@/presentation/hooks/use-ui';
import { ROUTES } from '@/presentation/navigation/access';

const VENTAJAS = ['Acceso con correo institucional', 'Tutores y reputaciones verificables', 'Tus solicitudes y horarios en un solo lugar'];

type Props = {
  title: string;
  description: string;
  /** Pestaña activa; sin ella no se muestran las pestañas (p. ej. en la verificación del correo). */
  activeTab?: 'login' | 'registro';
  children: ReactNode;
};

/**
 * Diseño de acceso de la web: panel azul de la comunidad y tarjeta blanca con pestañas
 * "Iniciar sesión / Registrarse" y el enlace para verificar el correo.
 */
export function AccessLayout({ title, description, activeTab, children }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const ui = useUI();

  const tab = (key: 'login' | 'registro', label: string, route: string) => {
    const active = key === activeTab;
    return (
      <Pressable
        key={key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => (active ? undefined : router.replace(route as typeof ROUTES.login))}
        style={[styles.tab, active && { backgroundColor: ui.primary }]}>
        <Text style={[styles.tabText, { color: active ? ui.onPrimary : ui.muted }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <KeyboardSafe>
      <ScrollView
        style={{ backgroundColor: ui.band }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        {...keyboardScrollProps}>
        <Text style={[styles.brand, { color: ui.navy }]}>{APP_NAME}</Text>

        <LinearGradient colors={[colors.headerStart, '#1046AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }} style={styles.panel}>
          <Text style={[styles.panelLabel, { color: colors.headerAccent }]}>COMUNIDAD UNIVERSITARIA</Text>
          <Text style={styles.panelTitle}>Aprender juntos comienza aquí</Text>
          <Text style={styles.panelText}>Conecta con estudiantes verificados, agenda tutorías y fortalece tus materias desde una sola plataforma.</Text>
          <View style={styles.list}>
            {VENTAJAS.map((v) => (
              <Text key={v} style={styles.panelText}>
                ✓ {v}
              </Text>
            ))}
          </View>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: ui.surface, borderColor: ui.border }]}>
          <View style={styles.gap4}>
            <Txt variant="h1">{title}</Txt>
            <Txt variant="small" color="muted">
              {description}
            </Txt>
          </View>
          {activeTab ? (
            <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: ui.primarySoft }]}>
              {tab('login', 'Iniciar sesión', ROUTES.login)}
              {tab('registro', 'Registrarse', ROUTES.registro)}
            </View>
          ) : null}
          {children}
          {activeTab && isApiEnabled() ? (
            <Pressable accessibilityRole="link" onPress={() => router.push(ROUTES.verificarCuenta)} style={styles.link}>
              <Txt variant="label" color="primary">
                ¿Ya creaste tu cuenta? Verifica tu correo
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardSafe>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  brand: { fontSize: 25, fontWeight: '800', letterSpacing: -0.7 },
  panel: { borderRadius: 28, padding: 24, gap: 8 },
  panelLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  panelTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', letterSpacing: -0.5, lineHeight: 30 },
  panelText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 22 },
  list: { gap: 2, marginTop: 4 },
  card: { borderRadius: 26, borderWidth: 1, padding: 24, gap: 16 },
  gap4: { gap: 4 },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12 },
  tab: { flex: 1, minHeight: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  link: { alignItems: 'center', paddingVertical: 4 },
});
