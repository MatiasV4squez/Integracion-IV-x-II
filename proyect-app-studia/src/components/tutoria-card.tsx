import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { initials, statusBadge, statusLabel, type Tutoria } from '@/constants/tutorias';
import { useTheme } from '@/hooks/use-theme';

export function TutoriaCard({ tutoria, onPress }: { tutoria: Tutoria; onPress: () => void }) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const badge = statusBadge(tutoria.status, colors);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(tutoria.studentName)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.studentName} numberOfLines={1}>
          {tutoria.studentName}
        </Text>
        <Text style={styles.subject} numberOfLines={1}>
          {tutoria.subject}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {tutoria.date} · {tutoria.time} · {tutoria.modality}
        </Text>
      </View>
      <View style={styles.side}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{statusLabel(tutoria.status)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      boxShadow: '0 2px 8px rgba(15, 27, 45, 0.08)',
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: Radius.full,
      backgroundColor: colors.iconSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
    info: { flex: 1, marginHorizontal: Spacing.md },
    studentName: { color: colors.text, fontSize: 15, fontWeight: '700' },
    subject: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    meta: { color: colors.textMuted, fontSize: 12, marginTop: Spacing.xs },
    side: { alignItems: 'flex-end', gap: Spacing.sm },
    badge: {
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
    pressed: { opacity: 0.7 },
  });
}
