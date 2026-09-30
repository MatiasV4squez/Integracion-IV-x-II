import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { findTutoria, initials, statusBadge, statusLabel, type TutoriaStatus } from '@/constants/tutorias';
import { useTheme } from '@/hooks/use-theme';

export default function TutoriaDetailScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const tutoria = findTutoria(id);
  const [status, setStatus] = useState<TutoriaStatus | undefined>(tutoria?.status);

  if (!tutoria || !status) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No encontramos esta tutoría.</Text>
      </View>
    );
  }

  const badge = statusBadge(status, colors);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(tutoria.studentName)}</Text>
        </View>
        <Text style={styles.studentName}>{tutoria.studentName}</Text>
        <Text style={styles.subject}>{tutoria.subject}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{statusLabel(status)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.rowText}>
            {tutoria.date} · {tutoria.time}
          </Text>
        </View>
        <View style={styles.row}>
          <Ionicons
            name={tutoria.modality === 'Virtual' ? 'videocam-outline' : 'location-outline'}
            size={20}
            color={colors.primary}
          />
          <Text style={styles.rowText}>{tutoria.location}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notas</Text>
        <Text style={styles.notes}>{tutoria.notes}</Text>
      </View>

      {status !== 'completada' && status !== 'cancelada' && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => setStatus('confirmada')}
            style={({ pressed }) => [styles.actionButton, styles.confirmButton, pressed && styles.pressed]}>
            <Text style={styles.confirmButtonText}>Confirmar</Text>
          </Pressable>
          <Pressable
            onPress={() => setStatus('cancelada')}
            style={({ pressed }) => [styles.actionButton, styles.cancelButton, pressed && styles.pressed]}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg, gap: Spacing.md },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    emptyText: { color: colors.textMuted, fontSize: 15 },
    header: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.lg },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: Radius.full,
      backgroundColor: colors.iconSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    avatarText: { color: colors.primary, fontWeight: '800', fontSize: 22 },
    studentName: { color: colors.text, fontSize: 19, fontWeight: '800' },
    subject: { color: colors.textMuted, fontSize: 14 },
    badge: {
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      marginTop: Spacing.sm,
    },
    badgeText: { fontSize: 12, fontWeight: '700' },
    section: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
      boxShadow: '0 2px 8px rgba(15, 27, 45, 0.08)',
    },
    sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    rowText: { color: colors.text, fontSize: 14, flexShrink: 1 },
    notes: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    actionButton: {
      flex: 1,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    confirmButton: { backgroundColor: colors.primary },
    confirmButtonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
    cancelButton: { backgroundColor: colors.dangerBg },
    cancelButtonText: { color: colors.dangerText, fontWeight: '700', fontSize: 14 },
    pressed: { opacity: 0.7 },
  });
}
