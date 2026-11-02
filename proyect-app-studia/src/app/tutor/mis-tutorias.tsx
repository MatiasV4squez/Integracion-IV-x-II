import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { isApiEnabled } from '@/di/container';
import { AppButton } from '@/presentation/components/app-button';
import { Card } from '@/presentation/components/card';
import { EmptyState } from '@/presentation/components/empty-state';
import { ErrorState } from '@/presentation/components/error-state';
import { LoadingState } from '@/presentation/components/loading-state';
import { SessionCard } from '@/presentation/components/session-card';
import { ToneBadge } from '@/presentation/components/status-badge';
import { TutoriaCard } from '@/presentation/components/tutoria-card';
import { Txt } from '@/presentation/components/txt';
import { Spacing, type ThemeColors } from '@/presentation/constants/theme';
import { TUTORIAS } from '@/presentation/constants/tutorias';
import { useSesiones } from '@/presentation/hooks/use-sesiones';
import { useTheme } from '@/presentation/hooks/use-theme';
import { ROUTES } from '@/presentation/navigation/access';
import { useSessions } from '@/presentation/state/sessions-context';
import { formatDate, formatTimeRange } from '@/shared/format';

export default function MisTutoriasScreen() {
  return isApiEnabled() ? <MisTutoriasApi /> : <MisTutoriasDemo />;
}

/** Sin backend: tutorías de ejemplo (src/constants/tutorias). */
function MisTutoriasDemo() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <MisHorarios />
      <Txt variant="h3">Solicitudes y sesiones</Txt>
      {TUTORIAS.map((tutoria) => (
        <TutoriaCard
          key={tutoria.id}
          tutoria={tutoria}
          onPress={() => router.push(`/tutor/tutoria/${tutoria.id}`)}
        />
      ))}
    </ScrollView>
  );
}

/** Con backend: sesiones en que el usuario es el tutor (agendamiento-sesiones); el detalle permite aceptar, rechazar y cerrar. */
function MisTutoriasApi() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { setLastViewed } = useSessions();
  const misSesiones = useSesiones({ role: 'tutor' });

  const sessions = useMemo(
    () => [...(misSesiones.data ?? [])].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [misSesiones.data],
  );

  const open = (id: string) => {
    setLastViewed(id);
    router.push({ pathname: '/detalle-sesion', params: { id } });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={misSesiones.isRefreshing} onRefresh={misSesiones.refresh} />}>
      <MisHorarios />
      <Txt variant="h3">Solicitudes y sesiones</Txt>
      {misSesiones.isLoading ? <LoadingState /> : null}
      {misSesiones.error && !misSesiones.data ? <ErrorState message={misSesiones.error.message} onRetry={misSesiones.refresh} /> : null}
      {misSesiones.data && sessions.length === 0 ? (
        <EmptyState icon="🗓️" title="Aún no tienes tutorías" message="Cuando un estudiante reserve uno de tus horarios, la solicitud aparecerá aquí." />
      ) : null}
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} onPress={() => open(session.id)} />
      ))}
    </ScrollView>
  );
}

/** Horarios que el tutor publicó: los próximos primero, marcados como libres o reservados. */
function MisHorarios() {
  const router = useRouter();
  const { myAvailability, now } = useSessions();
  const horarios = useMemo(
    () =>
      myAvailability
        .filter((b) => new Date(b.endsAt).getTime() > new Date(now).getTime())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [myAvailability, now],
  );

  return (
    <View style={localStyles.section}>
      <View style={localStyles.between}>
        <Txt variant="h3">Mis horarios disponibles</Txt>
        <AppButton label="Gestionar" size="sm" variant="ghost" onPress={() => router.push(ROUTES.publicarDisponibilidad)} />
      </View>
      {horarios.length === 0 ? (
        <Card>
          <Txt variant="small" color="muted">
            No tienes horarios publicados. Publica uno para que los estudiantes puedan reservarte.
          </Txt>
          <AppButton label="Publicar disponibilidad" size="sm" onPress={() => router.push(ROUTES.publicarDisponibilidad)} />
        </Card>
      ) : (
        horarios.map((b) => {
          const reservado = b.enrolled >= b.capacity;
          return (
            <Card key={b.id}>
              <View style={localStyles.between}>
                <View style={localStyles.flex}>
                  <Txt variant="label">{formatDate(b.startsAt)}</Txt>
                  <Txt variant="small" color="muted">
                    {formatTimeRange(b.startsAt, b.endsAt)}
                  </Txt>
                </View>
                <ToneBadge tone={reservado ? 'info' : 'success'} label={reservado ? 'Reservado' : 'Libre'} />
              </View>
            </Card>
          );
        })
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  section: { gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1 },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg, gap: Spacing.md },
  });
}
