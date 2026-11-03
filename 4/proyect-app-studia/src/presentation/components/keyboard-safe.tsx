import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

/**
 * Deja espacio para el teclado del teléfono, así el campo en que se escribe no queda tapado.
 * Funciona en Expo Go (no usa librerías nativas extra):
 * - Android: con la app de borde a borde la ventana no se achica sola, así que se agrega relleno abajo.
 * - iOS: las listas usan `keyboardScrollProps` (ajustan sus márgenes y se desplazan hasta el campo).
 */
export function KeyboardSafe({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'android' ? 'padding' : undefined}>
      {children}
    </KeyboardAvoidingView>
  );
}

/** Props para ScrollView/FlatList con campos de texto: siguen al campo activo y cierran el teclado al deslizar. */
export const keyboardScrollProps = {
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: 'on-drag',
  automaticallyAdjustKeyboardInsets: true,
} as const;

const styles = StyleSheet.create({ flex: { flex: 1 } });
