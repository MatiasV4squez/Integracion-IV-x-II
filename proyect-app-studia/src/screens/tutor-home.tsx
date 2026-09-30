import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TutorHome() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <View style={styles.body}>
      <Text style={styles.sectionTitle}>¿Qué quieres hacer hoy?</Text>

      <View style={styles.cards}>
        <Pressable
          onPress={() => router.push('/publicar-disponibilidad')}
          style={({ pressed }) => [styles.cardWrapper, pressed && styles.pressed]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
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
      fontSize: 18,
      fontWeight: '700',
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
      boxShadow: '0 2px 8px rgba(15, 27, 45, 0.08)',
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
      fontWeight: '800',
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
    actionOnSurface: { color: colors.primary },
    pressed: { opacity: 0.7 },
  });
}
