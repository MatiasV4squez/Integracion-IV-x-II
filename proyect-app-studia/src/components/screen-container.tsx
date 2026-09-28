import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type Props = { children: ReactNode; scroll?: boolean };

/** Fondo temático + área segura + ancho máximo centrado (útil en web/tablet). */
export function ScreenContainer({ children, scroll = true }: Props) {
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.inner}>{children}</View>
          </ScrollView>
        ) : (
          <View style={[styles.inner, styles.flex]}>{children}</View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
