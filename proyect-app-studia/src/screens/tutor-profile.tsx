import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { initials } from '@/constants/tutorias';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { ME_AS_TUTOR, ME_PROFILE } from '@/mocks/sessions';

// Mismo usuario que el resto de la app (@/mocks/sessions ME/ME_AS_TUTOR), solo con datos de perfil de ejemplo.
const TUTOR = {
  name: ME_AS_TUTOR.name,
  career: ME_PROFILE.career,
  university: ME_PROFILE.university,
  year: ME_PROFILE.year,
  gpa: ME_PROFILE.gpa,
  rating: ME_AS_TUTOR.reputation,
};

const STATS = [
  { icon: 'school-outline' as const, value: '32', label: 'Tutorías dadas' },
  { icon: 'time-outline' as const, value: '48h', label: 'Horas totales' },
  { icon: 'star-outline' as const, value: String(ME_AS_TUTOR.reputation), label: 'Calificación' },
];

const SUBJECTS = ['Cálculo I', 'Cálculo II', 'Álgebra Lineal', 'Programación I'];

const AVAILABILITY = [
  { day: 'Lunes', time: '10:00 - 12:00' },
  { day: 'Miércoles', time: '14:00 - 16:00' },
  { day: 'Viernes', time: '09:00 - 11:00' },
];

export default function TutorProfileScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const styles = createStyles(colors);

  const signOut = () => {
    logout();
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
          <Text style={styles.ratingText}>{TUTOR.rating} de calificación promedio</Text>
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
        {AVAILABILITY.map((slot) => (
          <View key={slot.day} style={styles.availabilityRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.availabilityDay}>{slot.day}</Text>
            <Text style={styles.availabilityTime}>{slot.time}</Text>
          </View>
        ))}
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
      boxShadow: '0 2px 8px rgba(15, 27, 45, 0.08)',
    },
    statValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
    statLabel: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
    section: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
      boxShadow: '0 2px 8px rgba(15, 27, 45, 0.08)',
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
