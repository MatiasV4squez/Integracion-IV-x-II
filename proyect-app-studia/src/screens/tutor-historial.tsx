import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TutoriaCard } from '@/components/tutoria-card';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { TUTORIAS } from '@/constants/tutorias';
import { useTheme } from '@/hooks/use-theme';

const HISTORIAL = TUTORIAS.filter(
  (tutoria) => tutoria.status === 'completada' || tutoria.status === 'cancelada',
);

export default function TutorHistorialScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {HISTORIAL.length === 0 ? (
        <Text style={styles.empty}>Todavía no tienes tutorías pasadas.</Text>
      ) : (
        HISTORIAL.map((tutoria) => (
          <TutoriaCard
            key={tutoria.id}
            tutoria={tutoria}
            onPress={() => router.push(`/tutor/tutoria/${tutoria.id}`)}
          />
        ))
      )}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg, gap: Spacing.md },
    empty: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: Spacing.xl },
  });
}
