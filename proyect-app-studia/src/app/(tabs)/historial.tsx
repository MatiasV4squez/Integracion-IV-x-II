import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { RESERVAS_HISTORIAL, reservaStatusBadge, reservaStatusLabel } from '@/constants/reservas';
import { useTheme } from '@/hooks/use-theme';
import { useTutorMode } from '@/hooks/use-tutor-mode';
import TutorHistorialScreen from '@/screens/tutor-historial';

export default function HistorialScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { isTutor } = useTutorMode();

  if (isTutor) {
    return <TutorHistorialScreen />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {RESERVAS_HISTORIAL.map((reserva) => {
        const badge = reservaStatusBadge(reserva.status, colors);
        return (
          <View key={reserva.id} style={styles.card}>
            <View style={styles.icon}>
              <Ionicons name="business-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.info}>
              <Text style={styles.room} numberOfLines={1}>
                {reserva.room}
              </Text>
              <Text style={styles.location} numberOfLines={1}>
                {reserva.location}
              </Text>
              <Text style={styles.meta}>
                {reserva.date} · {reserva.time}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {reservaStatusLabel(reserva.status)}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg, gap: Spacing.md },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      boxShadow: '0 2px 8px rgba(15, 27, 45, 0.08)',
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: colors.iconSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, marginHorizontal: Spacing.md },
    room: { color: colors.text, fontSize: 15, fontWeight: '700' },
    location: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    meta: { color: colors.textMuted, fontSize: 12, marginTop: Spacing.xs },
    badge: {
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
  });
}
