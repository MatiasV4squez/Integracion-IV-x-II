import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { RatingStars } from '@/components/rating-stars';
import { ScreenContainer } from '@/components/screen-container';
import { SectionHeader } from '@/components/section-header';
import { StatTile } from '@/components/stat-tile';
import { Txt } from '@/components/txt';
import { useAuth } from '@/hooks/use-auth';
import { usePerfil } from '@/hooks/use-perfil';
import { useSesiones } from '@/hooks/use-sesiones';
import { useUI } from '@/hooks/use-ui';

const ACTIVE_STATUSES = ['pendiente', 'confirmada', 'pendiente_cierre'];

/** Perfil del Tutee: mismo usuario que el resto de la app (@/mocks/sessions ME), con sus datos académicos y su historial como Tutee. */
export default function TuteeProfileScreen() {
  const ui = useUI();
  const router = useRouter();
  const { logout } = useAuth();
  const perfil = usePerfil();
  const misSesiones = useSesiones({ role: 'tutee' });

  const signOut = () => {
    logout();
    router.replace('/login');
  };

  const tuteeSessions = useMemo(() => misSesiones.data ?? [], [misSesiones.data]);
  const completed = useMemo(() => tuteeSessions.filter((s) => s.status === 'completada'), [tuteeSessions]);
  const activeCount = tuteeSessions.filter((s) => ACTIVE_STATUSES.includes(s.status)).length;

  const receivedAvg = useMemo(() => {
    const ratings = completed.flatMap((s) => (s.receivedRating ? [s.receivedRating] : []));
    return ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
  }, [completed]);

  const subjects = useMemo(() => {
    const seen = new Map<string, string>();
    tuteeSessions.forEach((s) => seen.set(s.subject.code, s.subject.name));
    return [...seen.entries()];
  }, [tuteeSessions]);

  const me = perfil.data;
  if (!me) {
    return (
      <ScreenContainer>
        {perfil.isLoading || !perfil.error ? (
          <LoadingState message="Cargando tu perfil…" />
        ) : (
          <ErrorState message={perfil.error.message} onRetry={perfil.refresh} />
        )}
        <AppButton label="Cerrar sesión" variant="secondary" onPress={signOut} />
      </ScreenContainer>
    );
  }

  const refresh = () => {
    perfil.refresh();
    misSesiones.refresh();
  };

  return (
    <ScreenContainer refreshing={perfil.isRefreshing || misSesiones.isRefreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <Avatar name={me.name} size={76} />
        <Txt variant="h1">{me.name}</Txt>
        <Txt variant="small" color="muted">
          {me.career} · {me.university}
        </Txt>
        {receivedAvg ? (
          <View style={styles.ratingRow}>
            <RatingStars value={Math.round(Number(receivedAvg))} size={16} />
            <Txt variant="small" color="muted">
              {receivedAvg} de calificación recibida
            </Txt>
          </View>
        ) : null}
      </View>

      <View style={styles.tiles}>
        <StatTile value={String(completed.length)} label="Completadas" />
        <StatTile value={String(activeCount)} label="Activas" />
        <StatTile value={receivedAvg ? `★ ${receivedAvg}` : '—'} label="Calificación recibida" />
      </View>

      <Card>
        <Txt variant="h3">Datos académicos</Txt>
        <InfoRow label="Universidad" value={me.university} />
        <InfoRow label="Carrera" value={me.career} />
        <InfoRow label="Año" value={me.year} />
        <InfoRow label="Promedio (PPA)" value={me.gpa} />
      </Card>

      <SectionHeader title="Materias en las que recibes tutoría" />
      {subjects.length === 0 ? (
        <Txt variant="small" color="muted">
          Aún no has tomado tutorías. Ve a &quot;Buscar&quot; para reservar la primera.
        </Txt>
      ) : (
        <View style={styles.chipRow}>
          {subjects.map(([code, name]) => (
            <View key={code} style={[styles.chip, { backgroundColor: ui.surfaceAlt }]}>
              <Txt variant="label">{name}</Txt>
            </View>
          ))}
        </View>
      )}

      <AppButton label="Cerrar sesión" variant="secondary" onPress={signOut} />
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Txt variant="small" color="muted">
        {label}
      </Txt>
      <Txt variant="small">{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tiles: { flexDirection: 'row', gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
});
