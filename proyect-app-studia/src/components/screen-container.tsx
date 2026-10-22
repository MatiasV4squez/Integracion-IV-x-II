import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useUI } from '@/hooks/use-ui';

type Props = { children: ReactNode; scroll?: boolean };

/** Fondo del rediseño + área segura + ancho máximo centrado (útil en web/tablet). */
export function ScreenContainer({ children, scroll = true }: Props) {
  const ui = useUI();

  return (
    <View style={[styles.root, { backgroundColor: ui.bg }]}>
      <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
  scrollContent: { flexGrow: 1, paddingBottom: Spacing.six },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.three },
});
