import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/presentation/components/app-button';
import { Avatar } from '@/presentation/components/avatar';
import { Card } from '@/presentation/components/card';
import { PreferencesCard } from '@/presentation/components/preferences-card';
import { RatingStars } from '@/presentation/components/rating-stars';
import { ScreenContainer } from '@/presentation/components/screen-container';
import { SectionHeader } from '@/presentation/components/section-header';
import { StatTile } from '@/presentation/components/stat-tile';
import { Txt } from '@/presentation/components/txt';
import { useAuth } from '@/presentation/hooks/use-auth';
import { usePerfil } from '@/presentation/hooks/use-perfil';
import { useUI } from '@/presentation/hooks/use-ui';
import { canBeTutor, isAdmin, ROUTES } from '@/presentation/navigation/access';
import { useSessions } from '@/presentation/state/sessions-context';
import { joinDetails } from '@/shared/format';

const ACTIVE_STATUSES = ['pendiente', 'confirmada', 'pendiente_cierre'];

/** Perfil del Tutee: el usuario de la sesión, con sus datos académicos y su historial como Tutee. */
export default function TuteeProfileScreen() {
  const ui = useUI();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { sessions } = useSessions();
  const { data: perfil } = usePerfil();
  const name = perfil?.name ?? user?.name ?? '';

  const signOut = async () => {
    await logout();
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
        <Avatar name={name} size={76} />
        <Txt variant="h1">{name}</Txt>
        {perfil ? (
          <Txt variant="small" color="muted">
            {joinDetails(perfil.career !== '—' && perfil.career, perfil.university)}
          </Txt>
        ) : null}
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
        <StatTile value={receivedAvg ? `★ ${receivedAvg}` : '—'} label="Nota recibida" />
      </View>

      <Card>
        <Txt variant="h3">Datos académicos</Txt>
        <InfoRow label="Universidad" value={perfil?.university ?? '—'} />
        <InfoRow label="Carrera" value={perfil?.career ?? '—'} />
        <InfoRow label="Año" value={perfil?.year ?? '—'} />
        <InfoRow label="Promedio (PPA)" value={perfil?.gpa ?? '—'} />
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

      <Card>
        {/* Quien ya es tutor (y está en modo Tutee) puede sumar materias; el resto, postular por primera vez. */}
        <Txt variant="h3">{user && canBeTutor(user.roles) ? 'Tus materias como tutor' : '¿Quieres hacer tutorías?'}</Txt>
        <Txt variant="small" color="muted">
          Postula con tu certificado de notas en las materias que aprobaste.
        </Txt>
        <AppButton
          label={user && canBeTutor(user.roles) ? 'Postular a otra materia' : 'Ser tutor'}
          variant="secondary"
          onPress={() => router.push(ROUTES.postulacionTutor)}
        />
      </Card>

      {user && isAdmin(user.roles) ? (
        <AppButton label="Administración: postulaciones" variant="secondary" onPress={() => router.push(ROUTES.adminPostulaciones)} />
      ) : null}

      <PreferencesCard />

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
