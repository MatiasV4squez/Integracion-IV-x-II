import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { NoticeBanner } from '@/components/notice-banner';
import { useUI } from '@/hooks/use-ui';

type Props = {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  /** Error al pedir la página siguiente (los ítems ya cargados se mantienen). */
  error?: Error;
  label?: string;
};

/** Pie de listados paginados: spinner mientras carga, botón "Cargar más" o error con reintento. */
export function LoadMore({ hasMore, isLoadingMore, onLoadMore, error, label = 'Cargar más' }: Props) {
  const ui = useUI();
  if (isLoadingMore) {
    return (
      <View style={styles.box}>
        <ActivityIndicator color={ui.primary} accessibilityLabel="Cargando más" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.box}>
        <NoticeBanner tone="danger" message={error.message} />
        <AppButton label="Reintentar" variant="secondary" size="sm" onPress={onLoadMore} />
      </View>
    );
  }
  if (!hasMore) return null;
  return (
    <View style={styles.box}>
      <AppButton label={label} variant="secondary" size="sm" onPress={onLoadMore} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, paddingVertical: 12, alignItems: 'stretch' },
});
