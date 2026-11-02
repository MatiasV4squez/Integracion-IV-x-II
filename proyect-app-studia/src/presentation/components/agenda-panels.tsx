import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/presentation/components/app-button';
import { Card } from '@/presentation/components/card';
import { SessionCard } from '@/presentation/components/session-card';
import { StatTile } from '@/presentation/components/stat-tile';
import { Txt } from '@/presentation/components/txt';
import { useTheme } from '@/presentation/hooks/use-theme';
import { useSessions } from '@/presentation/state/sessions-context';
import { formatDate, formatTimeRange } from '@/shared/format';
import { clasesActivas, historialReciente, proximaClase, resumenEstudiante, resumenTutor, sesionesAgendadasTutor } from '@/domain/sesiones/resumen-agenda';

const SOLICITUDES_VISIBLES = 3;

function useOpenSession() {
  const router = useRouter();
  const { setLastViewed } = useSessions();
  return (id: string) => {
    setLastViewed(id);
    router.push({ pathname: '/detalle-sesion', params: { id } });
  };
}

/** Inicio del estudiante: su próxima clase confirmada y cuántas solicitudes tiene en curso. */
export function StudentAgendaPanel() {
  const router = useRouter();
  const colors = useTheme();
  const { sessions, now } = useSessions();
  const open = useOpenSession();
  const proxima = proximaClase(sessions, now);

  return (
    <View style={styles.gap}>
      <Txt variant="h2">Tu próxima clase</Txt>
      {/* Tarjeta azul con degradado, como "Tu próxima clase" del panel web. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => (proxima ? open(proxima.id) : router.push('/buscar'))}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
        <LinearGradient colors={[colors.headerStart, colors.headerEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }} style={styles.nextCard}>
          <Text style={[styles.nextLabel, { color: colors.headerAccent }]}>{proxima ? 'CLASE CONFIRMADA' : 'SIN CLASES CONFIRMADAS'}</Text>
          <Text style={styles.nextTitle}>{proxima ? proxima.subject.name : 'Un espacio para seguir aprendiendo'}</Text>
          <Text style={styles.nextText}>
            {proxima
              ? `Con ${proxima.tutor.name} · ${formatDate(proxima.startsAt)} · ${formatTimeRange(proxima.startsAt, proxima.endsAt)}`
              : 'Tu próxima clase confirmada aparecerá aquí.'}
          </Text>
          <View style={styles.nextButton}>
            <Text style={styles.nextButtonText}>{proxima ? 'Ver detalle' : 'Buscar tutores'}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/**
 * Inicio del estudiante: resumen de sus agendamientos, las clases en curso (pendientes,
 * confirmadas o por cerrar) y las últimas terminadas. Cada tarjeta abre el detalle de la sesión.
 */
export function StudentAgendaList() {
  const router = useRouter();
  const { sessions } = useSessions();
  const open = useOpenSession();
  const resumen = resumenEstudiante(sessions);
  const activas = clasesActivas(sessions);
  const recientes = historialReciente(sessions);

  return (
    <View style={styles.gap}>
      <View style={styles.tiles}>
        <StatTile value={String(resumen.pendientes)} label="Pendientes" />
        <StatTile value={String(resumen.confirmadas)} label="Confirmadas" />
        <StatTile value={String(resumen.completadas)} label="Completadas" />
      </View>

      <View style={styles.between}>
        <Txt variant="h2">Tus clases agendadas</Txt>
        <AppButton label="Solicitar" size="sm" variant="ghost" onPress={() => router.push('/buscar')} />
      </View>
      {activas.length === 0 ? (
        <Card>
          <Txt variant="label">Tu agenda de aprendizaje</Txt>
          <Txt variant="small" color="muted">
            Aquí verás tus tutorías y el estado de cada solicitud.
          </Txt>
          <AppButton label="Buscar tutores" size="sm" variant="secondary" onPress={() => router.push('/buscar')} />
        </Card>
      ) : (
        activas.map((s) => <SessionCard key={s.id} session={s} onPress={() => open(s.id)} />)
      )}

      {recientes.length > 0 ? (
        <>
          <View style={styles.between}>
            <Txt variant="h2">Historial reciente</Txt>
            <AppButton label="Ver todo" size="sm" variant="ghost" onPress={() => router.push('/historial')} />
          </View>
          {recientes.map((s) => (
            <SessionCard key={s.id} session={s} onPress={() => open(s.id)} />
          ))}
        </>
      ) : null}
    </View>
  );
}

/** Inicio del tutor: solicitudes por responder, próxima sesión, horarios libres y tutorías completadas. */
export function TutorAgendaPanel() {
  const router = useRouter();
  const { sessions, myAvailability, now } = useSessions();
  const open = useOpenSession();
  const resumen = resumenTutor(sessions, myAvailability, now);
  const agendadas = sesionesAgendadasTutor(sessions);
  const recientes = historialReciente(sessions, 3, 'tutor');

  return (
    <View style={styles.gap}>
      <View style={styles.tiles}>
        <StatTile value={String(resumen.solicitudes.length)} label="Por responder" />
        <StatTile value={String(resumen.bloquesDisponibles)} label="Horarios libres" />
        <StatTile value={String(resumen.completadas)} label="Completadas" />
      </View>

      <View style={styles.between}>
        <Txt variant="h2">Solicitudes recibidas</Txt>
        <AppButton label="Ver todas" size="sm" variant="ghost" onPress={() => router.push('/tutor/mis-tutorias')} />
      </View>
      {resumen.solicitudes.length === 0 ? (
        <Txt variant="small" color="muted">
          No tienes solicitudes por responder.
        </Txt>
      ) : (
        resumen.solicitudes.slice(0, SOLICITUDES_VISIBLES).map((s) => <SessionCard key={s.id} session={s} onPress={() => open(s.id)} />)
      )}
      {resumen.solicitudes.length > SOLICITUDES_VISIBLES ? (
        <Txt variant="caption" color="muted">
          Y {resumen.solicitudes.length - SOLICITUDES_VISIBLES} más en &quot;Mis tutorías&quot;.
        </Txt>
      ) : null}

      <Txt variant="h2">Próximas sesiones</Txt>
      {agendadas.length === 0 ? (
        <Txt variant="small" color="muted">
          Aún no tienes sesiones confirmadas.
        </Txt>
      ) : (
        agendadas.map((s) => <SessionCard key={s.id} session={s} onPress={() => open(s.id)} />)
      )}

      {recientes.length > 0 ? (
        <>
          <View style={styles.between}>
            <Txt variant="h2">Historial reciente</Txt>
            <AppButton label="Ver todo" size="sm" variant="ghost" onPress={() => router.push('/historial')} />
          </View>
          {recientes.map((s) => (
            <SessionCard key={s.id} session={s} onPress={() => open(s.id)} />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 10 },
  tiles: { flexDirection: 'row', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextCard: { borderRadius: 18, padding: 24, gap: 6 },
  nextLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  nextTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  nextText: { color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 22 },
  nextButton: { alignSelf: 'flex-start', marginTop: 10, minHeight: 40, paddingHorizontal: 18, borderRadius: 11, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  nextButtonText: { color: '#135AB8', fontSize: 14, fontWeight: '700' },
});
