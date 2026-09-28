import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { FilterChip } from '@/components/filter-chip';
import { SessionCard } from '@/components/session-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { MOCK_SESSIONS } from '@/mocks/sessions';
import type { Session, SessionStatus } from '@/types/session';

type StatusFilter = 'todas' | 'activas' | 'completadas' | 'otras';
type RoleFilter = 'todos' | 'tutee' | 'tutor';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'activas', label: 'Activas' },
  { key: 'completadas', label: 'Completadas' },
  { key: 'otras', label: 'Otras' },
];

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: 'todos', label: 'Todos los roles' },
  { key: 'tutee', label: 'Como Tutee' },
  { key: 'tutor', label: 'Como Tutor' },
];

const ACTIVE: SessionStatus[] = ['pendiente', 'confirmada', 'pendiente_cierre', 'en_conflicto'];

function matchesStatus(session: Session, filter: StatusFilter) {
  if (filter === 'todas') return true;
  if (filter === 'activas') return ACTIVE.includes(session.status);
  if (filter === 'completadas') return session.status === 'completada';
  return !ACTIVE.includes(session.status) && session.status !== 'completada';
}

type Props = {
  sessions?: Session[];
  /** Se conectará con la pantalla de detalle en una etapa posterior. */
  onSessionPress?: (session: Session) => void;
};

/** RF19 / CA19: historial de sesiones con su estado y calificación. */
export default function HistorialScreen({ sessions = MOCK_SESSIONS, onSessionPress }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('todos');

  const visible = useMemo(
    () =>
      sessions
        .filter((s) => matchesStatus(s, statusFilter))
        .filter((s) => roleFilter === 'todos' || s.myRole === roleFilter)
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()),
    [sessions, statusFilter, roleFilter],
  );

  return (
    <ThemedView style={styles.root}>
      {/* FlatList = lista virtualizada (NFR18) */}
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <ThemedText type="subtitle" style={styles.title}>
                Mis tutorías
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {visible.length} {visible.length === 1 ? 'sesión' : 'sesiones'}
              </ThemedText>
            </View>

            <View style={styles.chips}>
              {STATUS_FILTERS.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  selected={statusFilter === f.key}
                  onPress={() => setStatusFilter(f.key)}
                />
              ))}
            </View>
            <View style={styles.chips}>
              {ROLE_FILTERS.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  selected={roleFilter === f.key}
                  onPress={() => setRoleFilter(f.key)}
                />
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard session={item} onPress={onSessionPress ? () => onSessionPress(item) : undefined} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText type="default">No hay sesiones con estos filtros</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Prueba con otra combinación.
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: { gap: Spacing.three, marginBottom: Spacing.three },
  title: { fontSize: 28, lineHeight: 36 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  separator: { height: Spacing.three - 4 },
  empty: { alignItems: 'center', gap: 4, paddingVertical: Spacing.five },
});
