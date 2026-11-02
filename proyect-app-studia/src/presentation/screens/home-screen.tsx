import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_NAME } from '@/shared/app-config';
import { Radius, Spacing, type ThemeColors } from '@/presentation/constants/theme';
import { useAuth } from '@/presentation/hooks/use-auth';
import { useTheme } from '@/presentation/hooks/use-theme';
import { useTutorMode } from '@/presentation/hooks/use-tutor-mode';
import { ME } from '@/di/demo';
import { StudentAgendaList, StudentAgendaPanel } from '@/presentation/components/agenda-panels';
import TutorHome from '@/presentation/screens/tutor-home';

// Sin backend se usa el mismo usuario demo que el resto de la app: @/mocks/sessions ME.

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function HomeScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const me = user ?? ME;
  const router = useRouter();
  const { isTutor, setIsTutor, canBeTutor } = useTutorMode();


  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Franja de bienvenida como el panel de la web: saludo, pregunta y buscador de tutores. */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <View style={styles.headerTop}>
            <Text style={styles.brand}>{APP_NAME}</Text>
            <View style={styles.headerActions}>
              {canBeTutor ? (
                <View style={styles.modeSwitch}>
                  <Text style={styles.modeSwitchLabel}>{isTutor ? 'Modo tutor' : 'Tutor'}</Text>
                  <Switch
                    value={isTutor}
                    onValueChange={setIsTutor}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={colors.border}
                    accessibilityLabel="Cambiar a inicio de tutor"
                  />
                </View>
              ) : null}
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(me.name)}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.greeting}>Hola, {me.name}</Text>
          <Text style={styles.subtitle}>{isTutor ? 'Revisa tus solicitudes, sesiones y horarios.' : '¿Qué quieres aprender hoy?'}</Text>

          {isTutor ? null : (
            <Pressable
              accessibilityRole="search"
              accessibilityLabel="Buscar tutores por materia"
              onPress={() => router.push('/buscar')}
              style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}>
              <Text style={styles.searchPlaceholder} numberOfLines={1}>
                Busca una materia o un tutor
              </Text>
              <View style={styles.searchButton}>
                <Text style={styles.searchButtonText}>Buscar</Text>
              </View>
            </Pressable>
          )}
        </View>

        {isTutor ? (
          <TutorHome />
        ) : (
          <View style={styles.body}>
            <StudentAgendaPanel />
            <StudentAgendaList />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: Spacing.xl * 2 },
    header: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xl,
      backgroundColor: colors.primarySoft,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    brand: { color: colors.primaryDark, fontSize: 22, fontWeight: '800', letterSpacing: -0.7 },
    subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: 2 },
    searchBar: {
      marginTop: Spacing.lg,
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingLeft: Spacing.lg,
      padding: 5,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
    },
    searchPlaceholder: { flex: 1, color: colors.textMuted, fontSize: 14 },
    searchButton: { minHeight: 44, paddingHorizontal: Spacing.xl, borderRadius: Radius.sm, backgroundColor: colors.primary, justifyContent: 'center' },
    searchButtonText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    modeSwitch: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    modeSwitchLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: colors.avatar,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.onAvatar, fontWeight: '700', fontSize: 15 },
    greeting: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: -0.5,
      marginTop: Spacing.lg,
    },
    body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.xl },
    pressed: { opacity: 0.7 },
  });
}
