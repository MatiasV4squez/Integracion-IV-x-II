import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TutorHome() {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.body}>
      <Text style={styles.sectionTitle}>¿Qué quieres hacer hoy?</Text>

      <View style={styles.cards}>
        <Pressable style={({ pressed }) => [styles.cardWrapper, pressed && styles.pressed]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}>
            <View style={[styles.iconBox, styles.iconBoxOnPrimary]}>
              <Ionicons name="add-circle-outline" size={28} color={colors.onPrimary} />
            </View>
            <Text style={[styles.cardTitle, styles.textOnPrimary]}>Hacer una solicitud</Text>
            <Text style={[styles.cardDescription, styles.mutedOnPrimary]}>
              Pide una tutoría y reserva un espacio
            </Text>
            <Text style={[styles.cardAction, styles.textOnPrimary]}>Solicitar →</Text>
          </LinearGradient>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.cardWrapper, pressed && styles.pressed]}>
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

      <Pressable style={({ pressed }) => [styles.wideCard, pressed && styles.pressed]}>
        <View style={styles.iconBox}>
          <Ionicons name="document-text-outline" size={26} color={colors.primary} />
        </View>
        <View style={styles.wideCardInfo}>
          <Text style={styles.wideCardTitle}>¿Quieres ser tutor?</Text>
          <Text style={styles.cardDescription}>Sube tus datos académicos</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </Pressable>
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
    wideCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginTop: Spacing.md,
      boxShadow: '0 2px 8px rgba(15, 27, 45, 0.08)',
    },
    wideCardInfo: { flex: 1, marginHorizontal: Spacing.md },
    wideCardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
    textOnPrimary: { color: colors.onPrimary },
    mutedOnPrimary: { color: 'rgba(255,255,255,0.85)' },
    actionOnSurface: { color: colors.primary },
    pressed: { opacity: 0.7 },
  });
}
