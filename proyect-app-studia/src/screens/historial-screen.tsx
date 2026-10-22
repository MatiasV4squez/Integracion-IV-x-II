import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { FilterChip } from '@/components/filter-chip';
import { SectionHeader } from '@/components/section-header';
import { SessionCard } from '@/components/session-card';
import { StatTile } from '@/components/stat-tile';
import { StatusBadge } from '@/components/status-badge';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useUI } from '@/hooks/use-ui';
import { useSessions } from '@/state/sessions-context';
import type { Session, SessionStatus } from '@/types/session';
import { formatDate, formatTimeRange, plural } from '@/utils/format';
import { respondToRequest } from '@/utils/session-machine';

type StatusFilter = 'todas' | 'activas' | 'completadas' | 'otras';
type RoleFilter = 'todos' | 'tutee' | 'tutor';

const ACTIVE: SessionStatus[] = ['pendiente', 'confirmada', 'pendiente_cierre', 'en_conflicto'];

const matchesStatus = (s: Session, f: StatusFilter) =>
  f === 'todas' ||
  (f === 'activas' && ACTIVE.includes(s.status)) ||
  (f === 'completadas' && s.status === 'completada') ||
  (f === 'otras' && !ACTIVE.includes(s.status) && s.status !== 'completada');

/** RF19 / CA19: historial de sesiones con búsqueda, filtros, acciones rápidas y acceso al detalle. */
export default function HistorialScreen() {
  const router = useRouter();
  const ui = useUI();
  const { sessions, now, run, setLastViewed } = useSessions();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('todos');
  const [newestFirst, setNewestFirst] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const openDetail = (id: string) => {
    setLastViewed(id);
    router.push({ pathname: '/detalle-sesion', params: { id } });
  };

  const counts = useMemo(
    () => ({
      todas: sessions.length,
      activas: sessions.filter((s) => matchesStatus(s, 'activas')).length,
      completadas: sessions.filter((s) => matchesStatus(s, 'completadas')).length,
      otras: sessions.filter((s) => matchesStatus(s, 'otras')).length,
    }),
    [sessions],
  );

  const average = useMemo(() => {
    const ratings = sessions.flatMap((s) => (s.receivedRating ? [s.receivedRating] : []));
    return ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';
  }, [sessions]);

  const next = useMemo(
    () =>
      sessions
        .filter((s) => s.status === 'confirmada' && new Date(s.startsAt) > new Date(now))
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0],
    [sessions, now],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter((s) => matchesStatus(s, statusFilter))
      .filter((s) => roleFilter === 'todos' || s.myRole === roleFilter)
      .filter((s) => {
        if (!q) return true;
        const other = s.myRole === 'tutee' ? s.tutor.name : s.tutee.name;
        return [s.subject.name, s.subject.code, other, s.topic ?? ''].some((t) => t.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const diff = new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
        return newestFirst ? diff : -diff;
      });
  }, [sessions, statusFilter, roleFilter, query, newestFirst]);

  const respond = (id: string, accept: boolean) => {
    const res = run((s) => respondToRequest(s, id, accept));
    setFeedback(res.ok ? (accept ? 'Solicitud aceptada: la sesión quedó confirmada.' : 'Solicitud rechazada.') : res.error);
  };

  const header = (
    <View style={styles.header}>
      <View>
        <Txt variant="h1">Mis tutorías</Txt>
        <Txt variant="small" color="muted">
          Revisa tus sesiones, abre el detalle y gestiona tus solicitudes.
        </Txt>
      </View>

      <View style={styles.tiles}>
        <StatTile value={String(counts.activas)} label="Activas" />
        <StatTile value={String(counts.completadas)} label="Completadas" />
        <StatTile value={average === '—' ? '—' : `★ ${average}`} label="Tu promedio" />
      </View>

      {next ? (
        <Card onPress={() => openDetail(next.id)} style={{ backgroundColor: ui.primarySoft, borderColor: ui.primarySoft }}>
          <Txt variant="caption" color="primary" style={styles.upper}>
            PRÓXIMA SESIÓN
          </Txt>
          <View style={styles.nextRow}>
            <Avatar name={next.myRole === 'tutee' ? next.tutor.name : next.tutee.name} size={44} />
            <View style={styles.flex}>
              <Txt variant="h3">{next.subject.name}</Txt>
              <Txt variant="small" color="muted">
                {formatDate(next.startsAt)} · {formatTimeRange(next.startsAt, next.endsAt)}
              </Txt>
              {next.topic ? (
                <Txt variant="small" color="muted">
                  Unidad: {next.topic}
                </Txt>
              ) : null}
            </View>
            <StatusBadge status={next.status} />
          </View>
        </Card>
      ) : null}

      <TextField placeholder="🔍  Buscar materia, persona o unidad" value={query} onChangeText={setQuery} />

      <View style={styles.chips}>
        <FilterChip label="Todas" count={counts.todas} selected={statusFilter === 'todas'} onPress={() => setStatusFilter('todas')} />
        <FilterChip label="Activas" count={counts.activas} selected={statusFilter === 'activas'} onPress={() => setStatusFilter('activas')} />
        <FilterChip label="Completadas" count={counts.completadas} selected={statusFilter === 'completadas'} onPress={() => setStatusFilter('completadas')} />
        <FilterChip label="Otras" count={counts.otras} selected={statusFilter === 'otras'} onPress={() => setStatusFilter('otras')} />
      </View>
      <View style={styles.chips}>
        <FilterChip label="Todos los roles" selected={roleFilter === 'todos'} onPress={() => setRoleFilter('todos')} />
        <FilterChip label="Como Tutee" selected={roleFilter === 'tutee'} onPress={() => setRoleFilter('tutee')} />
        <FilterChip label="Como Tutor" selected={roleFilter === 'tutor'} onPress={() => setRoleFilter('tutor')} />
      </View>

      {feedback ? (
        <Card style={{ backgroundColor: ui.primarySoft, borderColor: ui.primarySoft }}>
          <Txt variant="small" color="primary">
            {feedback}
          </Txt>
        </Card>
      ) : null}

      <SectionHeader
        title={plural(visible.length, 'sesión', 'sesiones')}
        actionLabel={newestFirst ? '↓ Más recientes' : '↑ Más antiguas'}
        onAction={() => setNewestFirst((v) => !v)}
      />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: ui.bg }]}>
      {/* FlatList = lista virtualizada (NFR18) */}
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => openDetail(item.id)}
            actions={
              item.status === 'pendiente' && item.myRole === 'tutor' ? (
                <>
                  <AppButton label="Aceptar" size="sm" onPress={() => respond(item.id, true)} />
                  <AppButton label="Rechazar" size="sm" variant="secondary" onPress={() => respond(item.id, false)} />
                </>
              ) : item.status === 'completada' && !item.myRating ? (
                <AppButton label="★ Calificar" size="sm" onPress={() => openDetail(item.id)} />
              ) : item.status === 'pendiente_cierre' ? (
                <AppButton label="Declarar resultado" size="sm" onPress={() => openDetail(item.id)} />
              ) : undefined
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="🔎" title="No hay sesiones con estos filtros" message="Prueba con otra búsqueda o cambia los filtros." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, paddingBottom: Spacing.six },
  header: { gap: Spacing.three, marginBottom: Spacing.three },
  tiles: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  separator: { height: 12 },
  upper: { letterSpacing: 0.8, fontWeight: '700' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
});
