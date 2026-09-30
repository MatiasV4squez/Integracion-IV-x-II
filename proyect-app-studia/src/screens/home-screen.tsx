import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTutorMode } from '@/hooks/use-tutor-mode';
import TutorHome from '@/screens/tutor-home';

// Datos de ejemplo: reemplazar por datos reales cuando exista el backend.
const USER = { name: 'María González' };

const ACTIVE_RESERVATION = {
  room: 'Cubículo A-03',
  location: 'Biblioteca Juan Pablo II · Piso 2',
  day: 'HOY',
  time: '14:00',
  remaining: '1h 30min restantes',
};

const STATS = [
  { icon: '📅', value: '3', label: 'Reservas hoy' },
  { icon: '⏱️', value: '12h', label: 'Horas usadas' },
  { icon: '🏛️', value: '4', label: 'Edificios' },
];

const CAMPUS = {
  name: 'Campus Juan Pablo II',
  buildings: [
    { id: '1', icon: '🏛️', name: 'Edificio Central', floors: 4, cubicles: 20, available: 8 },
    { id: '2', icon: '⚙️', name: 'Facultad de Ingeniería', floors: 5, cubicles: 15, available: 3 },
    { id: '3', icon: '📚', name: 'Biblioteca Juan Pablo II', floors: 3, cubicles: 24, available: 12 },
    { id: '4', icon: '⚖️', name: 'Facultad de Derecho', floors: 3, cubicles: 10, available: 0 },
  ],
};

// Menos de este número de cubículos libres se muestra como disponibilidad baja.
const LOW_AVAILABILITY = 5;

function availabilityBadge(available: number, colors: ThemeColors) {
  if (available === 0) {
    return { label: 'Sin disponibilidad', bg: colors.dangerBg, text: colors.dangerText };
  }
  const label = `${available} disponible${available === 1 ? '' : 's'}`;
  if (available < LOW_AVAILABILITY) {
    return { label, bg: colors.warningBg, text: colors.warningText };
  }
  return { label, bg: colors.successBg, text: colors.successText };
}

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
  const [query, setQuery] = useState('');
  const { isTutor, setIsTutor } = useTutorMode();

  const q = query.trim().toLowerCase();
  const buildings = CAMPUS.buildings.filter((building) => building.name.toLowerCase().includes(q));

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[colors.headerStart, colors.headerEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
          <View style={styles.headerTop}>
            <Text style={styles.kicker}>{isTutor ? 'MODO TUTOR' : 'BIENVENIDA DE VUELTA'}</Text>
            <View style={styles.headerActions}>
              <View style={styles.modeSwitch}>
                <Text style={styles.modeSwitchLabel}>Tutor</Text>
                <Switch
                  value={isTutor}
                  onValueChange={setIsTutor}
                  trackColor={{ false: 'rgba(255,255,255,0.25)', true: colors.primary }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="rgba(255,255,255,0.25)"
                  accessibilityLabel="Cambiar a inicio de tutor"
                />
              </View>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(USER.name)}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.greeting}>Hola, {USER.name} 👋</Text>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar edificio o cubículo..."
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={styles.search}
            returnKeyType="search"
          />
        </LinearGradient>

        {isTutor ? (
          <TutorHome />
        ) : (
          <View style={styles.body}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mis reservas activas</Text>
              <Pressable hitSlop={8}>
                <Text style={styles.sectionLink}>Ver todas</Text>
              </Pressable>
            </View>

            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.reservationCard}>
              <View style={styles.reservationTop}>
                <View style={styles.reservationInfo}>
                  <Text style={styles.reservationLabel}>RESERVA ACTIVA</Text>
                  <Text style={styles.reservationRoom}>{ACTIVE_RESERVATION.room}</Text>
                  <Text style={styles.reservationLocation}>{ACTIVE_RESERVATION.location}</Text>
                </View>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeDay}>{ACTIVE_RESERVATION.day}</Text>
                  <Text style={styles.timeBadgeTime}>{ACTIVE_RESERVATION.time}</Text>
                </View>
              </View>

              <View style={styles.reservationFooter}>
                <Text style={styles.reservationRemaining}>🕑 {ACTIVE_RESERVATION.remaining}</Text>
                <Pressable style={({ pressed }) => [styles.qrButton, pressed && styles.pressed]}>
                  <Text style={styles.qrButtonText}>Ver QR →</Text>
                </Pressable>
              </View>
            </LinearGradient>

            <View style={styles.stats}>
              {STATS.map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={styles.statIcon}>{stat.icon}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{CAMPUS.name}</Text>
              <Pressable hitSlop={8}>
                <Text style={styles.sectionLink}>Buscar espacio</Text>
              </Pressable>
            </View>

            {buildings.length === 0 ? (
              <Text style={styles.empty}>No encontramos edificios con ese nombre.</Text>
            ) : (
              buildings.map((building) => {
                const badge = availabilityBadge(building.available, colors);
                return (
                  <Pressable
                    key={building.id}
                    style={({ pressed }) => [styles.buildingCard, pressed && styles.pressed]}>
                    <View style={styles.buildingIcon}>
                      <Text style={styles.buildingIconText}>{building.icon}</Text>
                    </View>
                    <View style={styles.buildingInfo}>
                      <Text style={styles.buildingName} numberOfLines={1}>
                        {building.name}
                      </Text>
                      <Text style={styles.buildingMeta}>
                        {building.floors} pisos · {building.cubicles} cubículos
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}

            <Pressable style={({ pressed }) => [styles.wideCard, pressed && styles.pressed]}>
              <View style={styles.wideCardIcon}>
                <Ionicons name="document-text-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.wideCardInfo}>
                <Text style={styles.wideCardTitle}>¿Quieres ser tutor?</Text>
                <Text style={styles.buildingMeta}>Sube tus datos académicos</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </Pressable>
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
      borderBottomLeftRadius: Radius.xl,
      borderBottomRightRadius: Radius.xl,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    kicker: {
      color: colors.headerAccent,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1.5,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    modeSwitch: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    modeSwitchLabel: { color: colors.headerAccent, fontSize: 13, fontWeight: '600' },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
    greeting: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '800',
      marginTop: Spacing.sm,
    },
    search: {
      marginTop: Spacing.lg,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 16,
      color: '#FFFFFF',
    },
    body: { paddingHorizontal: Spacing.lg },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: Spacing.xl,
      marginBottom: Spacing.md,
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    sectionLink: { fontSize: 15, fontWeight: '600', color: colors.primary },
    reservationCard: {
      borderRadius: Radius.lg,
      padding: Spacing.lg,
    },
    reservationTop: { flexDirection: 'row', alignItems: 'flex-start' },
    reservationInfo: { flex: 1, marginRight: Spacing.md },
    reservationLabel: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1,
    },
    reservationRoom: {
      color: colors.onPrimary,
      fontSize: 22,
      fontWeight: '800',
      marginTop: Spacing.xs,
    },
    reservationLocation: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 15,
      marginTop: Spacing.xs,
    },
    timeBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    timeBadgeDay: { color: colors.onPrimary, fontSize: 13, fontWeight: '600' },
    timeBadgeTime: { color: colors.onPrimary, fontSize: 17, fontWeight: '800' },
    reservationFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: Spacing.xl,
    },
    reservationRemaining: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 13,
      flexShrink: 1,
    },
    qrButton: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      marginLeft: Spacing.sm,
    },
    qrButtonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 13 },
    stats: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.lg,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(15, 27, 45, 0.08)',
    },
    statIcon: { fontSize: 22 },
    statValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginTop: Spacing.sm,
    },
    statLabel: { color: colors.textMuted, fontSize: 12, marginTop: Spacing.xs },
    buildingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      boxShadow: '0 2px 8px rgba(15, 27, 45, 0.08)',
    },
    buildingIcon: {
      width: 52,
      height: 52,
      borderRadius: Radius.md,
      backgroundColor: colors.iconSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buildingIconText: { fontSize: 26 },
    buildingInfo: { flex: 1, marginHorizontal: Spacing.md },
    buildingName: { color: colors.text, fontSize: 16, fontWeight: '700' },
    buildingMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    badge: {
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs + 2,
    },
    badgeText: { fontSize: 13, fontWeight: '700' },
    empty: { color: colors.textMuted },
    wideCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginTop: Spacing.md,
      boxShadow: '0 2px 8px rgba(15, 27, 45, 0.08)',
    },
    wideCardIcon: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      backgroundColor: colors.iconSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wideCardInfo: { flex: 1, marginHorizontal: Spacing.md },
    wideCardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
    pressed: { opacity: 0.7 },
  });
}
