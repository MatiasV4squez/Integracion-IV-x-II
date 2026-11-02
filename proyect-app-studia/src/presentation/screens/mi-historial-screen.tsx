import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiEnabled } from '@/di/container';
import { AppButton } from '@/presentation/components/app-button';
import { Avatar } from '@/presentation/components/avatar';
import { Card } from '@/presentation/components/card';
import { EmptyState } from '@/presentation/components/empty-state';
import { ErrorState } from '@/presentation/components/error-state';
import { FilterChip } from '@/presentation/components/filter-chip';
import { LoadingState } from '@/presentation/components/loading-state';
import { NoticeBanner } from '@/presentation/components/notice-banner';
import { RatingStars } from '@/presentation/components/rating-stars';
import { StatTile } from '@/presentation/components/stat-tile';
import { StatusBadge } from '@/presentation/components/status-badge';
import { TextField } from '@/presentation/components/text-field';
import { Txt } from '@/presentation/components/txt';
import { MaxContentWidth, Spacing } from '@/presentation/constants/theme';
import { useClientPagination } from '@/presentation/hooks/use-client-pagination';
import { useSesiones } from '@/presentation/hooks/use-sesiones';
import { useUI } from '@/presentation/hooks/use-ui';
import { useSessions } from '@/presentation/state/sessions-context';
import type { Session, UserRole } from '@/domain/sesiones/session';
import { formatDate, formatTimeRange } from '@/shared/format';
import { conteoHistorial, historialPorRol, type FiltroHistorial } from '@/domain/sesiones/resumen-agenda';
import { respondToRequest } from '@/domain/sesiones/session-machine';

const FILTROS: { value: FiltroHistorial; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'completadas', label: 'Completadas' },
  { value: 'otras', label: 'Canceladas y otras' },
];

/** Textos que cambian según el modo (estudiante o tutor). */
const TEXTOS: Record<UserRole, {
  subtitle: string;
  total: string;
  promedio: string;
  vacio: Record<FiltroHistorial, { title: string; message: string }>;
}> = {
  tutee: {
    subtitle: 'Todas las tutorías que has solicitado, con su estado y la calificación que diste.',
    total: 'Tutorías',
    promedio: 'Tu promedio',
    vacio: {
      todas: { title: 'Aún no tienes tutorías', message: 'Cuando solicites una tutoría, aparecerá aquí con su estado.' },
      en_curso: { title: 'Nada en curso', message: 'No tienes solicitudes pendientes ni clases confirmadas.' },
      completadas: { title: 'Aún no completas tutorías', message: 'Cuando termines una tutoría, podrás calificarla desde aquí.' },
      otras: { title: 'Sin tutorías canceladas', message: 'Aquí verás las solicitudes canceladas, rechazadas o expiradas.' },
    },
  },
  tutor: {
    subtitle: 'Las tutorías que has dictado o te han solicitado, con su estado y la calificación que recibiste.',
    total: 'Dictadas',
    promedio: 'Nota recibida',
    vacio: {
      todas: { title: 'Aún no tienes tutorías', message: 'Cuando un estudiante reserve uno de tus horarios, la solicitud aparecerá aquí.' },
      en_curso: { title: 'Nada en curso', message: 'No tienes solicitudes por responder ni sesiones confirmadas.' },
      completadas: { title: 'Aún no completas tutorías', message: 'Las tutorías que dictes y se cierren como completadas aparecerán aquí.' },
      otras: { title: 'Sin tutorías canceladas', message: 'Aquí verás las solicitudes canceladas, rechazadas o expiradas.' },
    },
  },
};

/**
 * "Mi historial" (RF19): todas las tutorías del usuario en el modo activo, filtrables por estado y
 * buscables por materia o persona. En modo tutor permite aceptar o rechazar solicitudes desde la lista.
 */
export default function MiHistorialScreen({ role }: { role: UserRole }) {
  const router = useRouter();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const { run, setLastViewed, remote } = useSessions();
  const misSesiones = useSesiones({ role });
  const [filtro, setFiltro] = useState<FiltroHistorial>('todas');
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const textos = TEXTOS[role];

  const todas = useMemo(() => misSesiones.data ?? [], [misSesiones.data]);
  const conteo = useMemo(() => conteoHistorial(todas, role), [todas, role]);
  const lista = useMemo(() => {
    const q = query.trim().toLowerCase();
    return historialPorRol(todas, role, filtro).filter((s) => {
      if (!q) return true;
      const persona = role === 'tutee' ? s.tutor.name : s.tutee.name;
      return [s.subject.name, s.subject.code, persona].some((t) => t.toLowerCase().includes(q));
    });
  }, [todas, role, filtro, query]);
  const page = useClientPagination(lista);

  // Estudiante: la nota que dio. Tutor: la nota que recibió.
  const average = useMemo(() => {
    const ratings = todas.flatMap((s) => {
      const r = role === 'tutee' ? s.myRating : s.receivedRating;
      return s.status === 'completada' && r ? [r] : [];
    });
    return ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
  }, [todas, role]);

  const openDetail = (id: string) => {
    setLastViewed(id);
    router.push({ pathname: '/detalle-sesion', params: { id } });
  };

  const elegir = (value: FiltroHistorial) => {
    setFiltro(value);
    page.reset();
  };

  const respond = async (id: string, accept: boolean) => {
    const res = isApiEnabled() ? await remote.respond(id, accept) : run((s) => respondToRequest(s, id, accept));
    setFeedback(
      res.ok
        ? { ok: true, text: accept ? 'Solicitud aceptada: la sesión quedó confirmada.' : 'Solicitud rechazada.' }
        : { ok: false, text: res.error },
    );
  };

  const header = (
    <View style={styles.header}>
      <View>
        <Txt variant="h1">Mi historial</Txt>
        <Txt variant="small" color="muted">
          {textos.subtitle}
        </Txt>
      </View>
      <View style={styles.tiles}>
        <StatTile value={String(conteo.todas)} label={textos.total} />
        <StatTile value={String(conteo.completadas)} label="Completadas" />
        <StatTile value={average ? `★ ${average}` : '—'} label={textos.promedio} />
      </View>
      <TextField
        placeholder={role === 'tutee' ? '🔍  Buscar materia o tutor' : '🔍  Buscar materia o estudiante'}
        value={query}
        onChangeText={setQuery}
      />
      <View style={styles.filters}>
        {FILTROS.map((f) => (
          <FilterChip key={f.value} label={f.label} count={conteo[f.value]} selected={filtro === f.value} onPress={() => elegir(f.value)} />
        ))}
      </View>
      {feedback ? <NoticeBanner tone={feedback.ok ? 'success' : 'danger'} message={feedback.text} /> : null}
    </View>
  );

  const vacio = query.trim()
    ? { title: 'Sin resultados', message: 'Prueba con otra materia o persona.' }
    : textos.vacio[filtro];

  return (
    <View style={[styles.root, { backgroundColor: ui.bg, paddingTop: insets.top }]}>
      {/* FlatList = lista virtualizada (NFR18) */}
      <FlatList
        data={page.items}
        refreshing={misSesiones.isRefreshing}
        onRefresh={misSesiones.refresh}
        onEndReached={page.loadMore}
        onEndReachedThreshold={0.4}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <HistoryCard session={item} role={role} onPress={() => openDetail(item.id)} onRespond={respond} />}
        ListEmptyComponent={
          misSesiones.isLoading ? (
            <LoadingState message="Cargando tus tutorías…" />
          ) : misSesiones.error ? (
            <ErrorState message={misSesiones.error.message} onRetry={misSesiones.refresh} />
          ) : (
            <EmptyState
              icon="🎓"
              title={vacio.title}
              message={vacio.message}
              action={
                role === 'tutee'
                  ? { label: 'Buscar tutorías', onPress: () => router.navigate('/buscar') }
                  : { label: 'Publicar disponibilidad', onPress: () => router.navigate('/publicar-disponibilidad') }
              }
            />
          )
        }
      />
    </View>
  );
}

function HistoryCard({
  session,
  role,
  onPress,
  onRespond,
}: {
  session: Session;
  role: UserRole;
  onPress: () => void;
  onRespond: (id: string, accept: boolean) => void;
}) {
  const persona = role === 'tutee' ? session.tutor.name : session.tutee.name;
  const rating = role === 'tutee' ? session.myRating : session.receivedRating;
  const responder = role === 'tutor' && session.status === 'pendiente';
  const declarar = session.status === 'pendiente_cierre';

  // Con botones adentro la tarjeta no es presionable (en la web un botón no puede ir dentro de otro).
  return (
    <Card onPress={responder || declarar ? undefined : onPress} accessibilityLabel={`Tutoría de ${session.subject.name} con ${persona}`}>
      <View style={styles.row}>
        <Avatar name={persona} size={44} />
        <View style={styles.flex}>
          <Txt variant="h3">{session.subject.name}</Txt>
          <Txt variant="small" color="muted">
            {role === 'tutee' ? 'Con' : 'Estudiante:'} {persona}
          </Txt>
        </View>
        <StatusBadge status={session.status} />
      </View>
      <Txt variant="small" color="muted">
        📅 {formatDate(session.startsAt)} · {formatTimeRange(session.startsAt, session.endsAt)}
      </Txt>

      {session.status === 'completada' ? (
        <View style={styles.ratingRow}>
          <Txt variant="small" color="muted">
            {role === 'tutee' ? 'Tu calificación al tutor:' : 'Calificación recibida:'}
          </Txt>
          {rating ? (
            <RatingStars value={rating} size={16} />
          ) : (
            <Txt variant="small" color="primary">
              {role === 'tutee' ? 'Califícala ahora' : 'Aún sin calificar'}
            </Txt>
          )}
        </View>
      ) : null}

      {/* El tutor responde las solicitudes sin entrar al detalle. */}
      {responder ? (
        <View style={styles.actions}>
          <AppButton label="Aceptar" size="sm" onPress={() => onRespond(session.id, true)} />
          <AppButton label="Rechazar" size="sm" variant="secondary" onPress={() => onRespond(session.id, false)} />
          <AppButton label="Ver detalle" size="sm" variant="ghost" onPress={onPress} />
        </View>
      ) : null}
      {declarar ? <AppButton label="Declarar resultado" size="sm" variant="secondary" onPress={onPress} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.lg, paddingBottom: 64 },
  header: { gap: Spacing.lg, marginBottom: Spacing.lg },
  tiles: { flexDirection: 'row', gap: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  separator: { height: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
});
