import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TutorAgendaPanel } from '@/presentation/components/agenda-panels';
import { Radius, Spacing, type ThemeColors } from '@/presentation/constants/theme';
import { useTheme } from '@/presentation/hooks/use-theme';

export default function TutorHome() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <View style={styles.body}>
      <View style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>
        <TutorAgendaPanel />
      </View>

      <Text style={styles.sectionTitle}>¿Qué quieres hacer hoy?</Text>

      <View style={styles.cards}>
        <Pressable
          onPress={() => router.push('/publicar-disponibilidad')}
          style={({ pressed }) => [styles.cardWrapper, pressed && styles.pressed]}>
          <LinearGradient
            colors={[colors.headerStart, colors.headerEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}>
            <View style={[styles.iconBox, styles.iconBoxOnPrimary]}>
              <Ionicons name="calendar-outline" size={28} color={colors.onPrimary} />
            </View>
            <Text style={[styles.cardTitle, styles.textOnPrimary]}>Publicar disponibilidad</Text>
            <Text style={[styles.cardDescription, styles.mutedOnPrimary]}>
              Reserva un horario para dar tutoría
            </Text>
            <Text style={[styles.cardAction, styles.textOnPrimary]}>Publicar →</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.push('/tutor/mis-tutorias')}
          style={({ pressed }) => [styles.cardWrapper, pressed && styles.pressed]}>
          <View style={[styles.card, styles.cardSurface]}>
            <View style={styles.iconBox}>
              <Ionicons name="school-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Mis tutorías</Text>
            <Text style={styles.cardDescription}>Revisa tus tutorías programadas</Text>
            <Text style={[styles.cardAction, styles.actionOnSurface]}>Ver todas →</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { paddingHorizontal: Spacing.lg },
    sectionTitle: {
      fontSize: 21,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: colors.text,
      marginTop: Spacing.xl,
      marginBottom: Spacing.md,
    },
    cards: { flexDirection: 'row', gap: Spacing.md },
    cardWrapper: { flex: 1 },
    card: {
      flex: 1,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      minHeight: 190,
    },
    cardSurface: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      backgroundColor: colors.iconSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBoxOnPrimary: { backgroundColor: 'rgba(255,255,255,0.2)' },
    cardTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
      marginTop: Spacing.lg,
    },
    cardDescription: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: Spacing.xs,
    },
    cardAction: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 'auto',
      paddingTop: Spacing.md,
    },
    textOnPrimary: { color: colors.onPrimary },
    mutedOnPrimary: { color: 'rgba(255,255,255,0.85)' },
    actionOnSurface: { color: colors.primaryDark },
    pressed: { opacity: 0.7 },
  });
}
