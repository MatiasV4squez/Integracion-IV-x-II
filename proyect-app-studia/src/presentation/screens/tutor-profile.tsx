import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PreferencesCard } from '@/presentation/components/preferences-card';
import { Radius, Spacing, type ThemeColors } from '@/presentation/constants/theme';
import { initials } from '@/presentation/constants/tutorias';
import { isApiEnabled } from '@/di/container';
import { useAuth } from '@/presentation/hooks/use-auth';
import { usePerfil } from '@/presentation/hooks/use-perfil';
import { useTheme } from '@/presentation/hooks/use-theme';
import { isAdmin, ROUTES } from '@/presentation/navigation/access';
import { ME_AS_TUTOR } from '@/di/demo';
import { useSessions } from '@/presentation/state/sessions-context';
import { formatDuration, minutesBetween } from '@/shared/date-time';
import { formatDate, formatTimeRange } from '@/shared/format';

// Datos de ejemplo del modo demo (sin backend).
const DEMO_STATS = [
  { icon: 'school-outline' as const, value: '32', label: 'Tutorías dadas' },
  { icon: 'time-outline' as const, value: '48h', label: 'Horas totales' },
  { icon: 'star-outline' as const, value: String(ME_AS_TUTOR.reputation), label: 'Calificación' },
];

const DEMO_SUBJECTS = ['Cálculo I', 'Cálculo II', 'Álgebra Lineal', 'Programación I'];

const DEMO_AVAILABILITY = [
  { day: 'Lunes', time: '10:00 - 12:00' },
  { day: 'Miércoles', time: '14:00 - 16:00' },
  { day: 'Viernes', time: '09:00 - 11:00' },
];

/**
 * Con backend, estadísticas, materias y horarios salen de las sesiones dictadas (agendamiento-sesiones)
 * y de los bloques publicados (materias-tutores).
 */
function useTutorData() {
  const { sessions, myAvailability } = useSessions();
  const { data: perfil } = usePerfil();
  return useMemo(() => {
    if (!isApiEnabled()) return { stats: DEMO_STATS, subjects: DEMO_SUBJECTS, availability: DEMO_AVAILABILITY };
    const dictated = sessions.filter((s) => s.myRole === 'tutor' && s.status === 'completada');
    const minutes = dictated.reduce((sum, s) => sum + minutesBetween(s.startsAt, s.endsAt), 0);
    const rating = perfil?.reputation;
    return {
      stats: [
        { icon: 'school-outline' as const, value: String(dictated.length), label: 'Tutorías dadas' },
        { icon: 'time-outline' as const, value: formatDuration(minutes), label: 'Horas totales' },
        { icon: 'star-outline' as const, value: rating ? rating.toFixed(1) : '—', label: 'Calificación' },
      ],
      subjects: [...new Set(sessions.filter((s) => s.myRole === 'tutor').map((s) => s.subject.name))],
      availability: myAvailability.map((b) => ({ day: formatDate(b.startsAt), time: formatTimeRange(b.startsAt, b.endsAt) })),
    };
  }, [sessions, myAvailability, perfil]);
}

export default function TutorProfileScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, user } = useAuth();
  const styles = createStyles(colors);
  const { data: perfil } = usePerfil();
  const { stats: STATS, subjects: SUBJECTS, availability: AVAILABILITY } = useTutorData();
  const TUTOR = {
    name: perfil?.name ?? user?.name ?? '',
    career: perfil?.career ?? '—',
    university: perfil?.university ?? '—',
    year: perfil?.year ?? '—',
    gpa: perfil?.gpa ?? '—',
    rating: perfil?.reputation ?? null,
  };

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(TUTOR.name)}</Text>
        </View>
        <Text style={styles.name}>{TUTOR.name}</Text>
        <Text style={styles.career}>{TUTOR.career}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color={colors.warningText} />
          <Text style={styles.ratingText}>
            {TUTOR.rating !== null ? `${TUTOR.rating.toFixed(1)} de calificación promedio` : 'Aún sin calificaciones'}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        {STATS.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Ionicons name={stat.icon} size={20} color={colors.primary} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos académicos</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Universidad</Text>
          <Text style={styles.infoValue}>{TUTOR.university}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Carrera</Text>
          <Text style={styles.infoValue}>{TUTOR.career}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Año</Text>
          <Text style={styles.infoValue}>{TUTOR.year}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Promedio (PPA)</Text>
          <Text style={styles.infoValue}>{TUTOR.gpa}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Materias que enseña</Text>
        {SUBJECTS.length === 0 ? <Text style={styles.infoLabel}>Aún no has dictado tutorías.</Text> : null}
        <View style={styles.chipRow}>
          {SUBJECTS.map((subject) => (
            <View key={subject} style={styles.chip}>
              <Text style={styles.chipText}>{subject}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disponibilidad</Text>
        {AVAILABILITY.length === 0 ? <Text style={styles.infoLabel}>No tienes horarios publicados.</Text> : null}
        {AVAILABILITY.map((slot) => (
          <View key={`${slot.day}-${slot.time}`} style={styles.availabilityRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.availabilityDay}>{slot.day}</Text>
            <Text style={styles.availabilityTime}>{slot.time}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => router.push(ROUTES.postulacionTutor)}
        style={({ pressed }) => [styles.section, pressed && styles.pressed]}>
        <Text style={styles.sectionTitle}>Mis postulaciones</Text>
        <Text style={styles.infoLabel}>Postula a otra materia o revisa el estado de tus postulaciones →</Text>
      </Pressable>

      {user && isAdmin(user.roles) ? (
        <Pressable
          onPress={() => router.push(ROUTES.adminPostulaciones)}
          style={({ pressed }) => [styles.section, pressed && styles.pressed]}>
          <Text style={styles.sectionTitle}>Administración</Text>
          <Text style={styles.infoLabel}>Revisar postulaciones a tutor →</Text>
        </Pressable>
      ) : null}

      <View style={{ marginBottom: Spacing.lg }}>
        <PreferencesCard />
      </View>

      <Pressable
        onPress={signOut}
        style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl * 2 },
    header: { alignItems: 'center', paddingVertical: Spacing.md },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: Radius.full,
      backgroundColor: colors.iconSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    avatarText: { color: colors.primary, fontWeight: '800', fontSize: 24 },
    name: { color: colors.text, fontSize: 20, fontWeight: '800' },
    career: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
    ratingText: { color: colors.textMuted, fontSize: 13 },
    stats: { flexDirection: 'row', gap: Spacing.md },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      gap: Spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
    statLabel: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
    section: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
    infoLabel: { color: colors.textMuted, fontSize: 13 },
    infoValue: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
      backgroundColor: colors.iconSoft,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    availabilityDay: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
    availabilityTime: { color: colors.textMuted, fontSize: 13 },
    signOutButton: {
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.dangerText,
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    signOutText: { color: colors.dangerText, fontWeight: '700', fontSize: 15 },
    pressed: { opacity: 0.7 },
  });
}
