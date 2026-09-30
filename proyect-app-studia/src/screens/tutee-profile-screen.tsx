import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { RatingStars } from '@/components/rating-stars';
import { ScreenContainer } from '@/components/screen-container';
import { SectionHeader } from '@/components/section-header';
import { StatTile } from '@/components/stat-tile';
import { Txt } from '@/components/txt';
import { useAuth } from '@/hooks/use-auth';
import { useUI } from '@/hooks/use-ui';
import { ME, ME_PROFILE } from '@/mocks/sessions';
import { useSessions } from '@/state/sessions-context';

const ACTIVE_STATUSES = ['pendiente', 'confirmada', 'pendiente_cierre'];

/** Perfil del Tutee: mismo usuario que el resto de la app (@/mocks/sessions ME), con sus datos académicos y su historial como Tutee. */
export default function TuteeProfileScreen() {
  const ui = useUI();
  const router = useRouter();
  const { logout } = useAuth();
  const { sessions } = useSessions();

  const signOut = () => {
    logout();
    router.replace('/login');
  };

  const tuteeSessions = useMemo(() => sessions.filter((s) => s.myRole === 'tutee'), [sessions]);
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

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Avatar name={ME.name} size={76} />
        <Txt variant="h1">{ME.name}</Txt>
        <Txt variant="small" color="muted">
          {ME_PROFILE.career} · {ME_PROFILE.university}
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
        <InfoRow label="Universidad" value={ME_PROFILE.university} />
        <InfoRow label="Carrera" value={ME_PROFILE.career} />
        <InfoRow label="Año" value={ME_PROFILE.year} />
        <InfoRow label="Promedio (PPA)" value={ME_PROFILE.gpa} />
      </Card>

      <SectionHeader title="Materias en las que recibes tutoría" />
      {subjects.length === 0 ? (
        <Txt variant="small" color="muted">
          Aún no has tomado tutorías. Ve a "Buscar" para reservar la primera.
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
