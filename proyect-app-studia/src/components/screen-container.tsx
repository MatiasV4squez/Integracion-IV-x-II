import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useUI } from '@/hooks/use-ui';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** Desactiva el margen superior seguro cuando la pantalla ya tiene su propia cabecera (header nativo o uno propio). */
  topInset?: boolean;
  /** Pull-to-refresh (solo con `scroll`): se muestra si se pasa `onRefresh`. */
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Fondo del rediseño + área segura (incluye el notch) + ancho máximo centrado (útil en web/tablet). */
export function ScreenContainer({ children, scroll = true, topInset = true, refreshing = false, onRefresh }: Props) {
  const ui = useUI();
  const edges = topInset ? (['top', 'bottom', 'left', 'right'] as const) : (['bottom', 'left', 'right'] as const);

  return (
    <View style={[styles.root, { backgroundColor: ui.bg }]}>
      <SafeAreaView style={styles.root} edges={edges}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ui.primary} colors={[ui.primary]} /> : undefined
            }>
            <View style={styles.inner}>{children}</View>
          </ScrollView>
        ) : (
          <View style={[styles.inner, styles.root]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 64 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.lg, gap: Spacing.lg },
});
