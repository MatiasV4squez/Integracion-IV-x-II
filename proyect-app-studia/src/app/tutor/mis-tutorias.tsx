import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { TutoriaCard } from '@/components/tutoria-card';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { TUTORIAS } from '@/constants/tutorias';
import { useTheme } from '@/hooks/use-theme';

export default function MisTutoriasScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {TUTORIAS.map((tutoria) => (
        <TutoriaCard
          key={tutoria.id}
          tutoria={tutoria}
          onPress={() => router.push(`/tutor/tutoria/${tutoria.id}`)}
        />
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg, gap: Spacing.md },
  });
}
