import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { NoticeBanner } from '@/components/notice-banner';
import { RatingStars } from '@/components/rating-stars';
import { ScreenContainer } from '@/components/screen-container';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { STATUS_META } from '@/constants/session-status';
import { ACCENT } from '@/constants/tones';
import { useTheme } from '@/hooks/use-theme';
import type { Session, SessionStatus } from '@/types/session';
import { formatDate, formatDateTime, formatTimeRange } from '@/utils/format';
import {
  CLOSURE_TIMEOUT_HOURS,
  getAvailableActions,
  requestExpiresAt,
  type SessionAction,
} from '@/utils/session-machine';

type Props = {
  session: Session;
  /** Fecha ISO "actual". Por defecto, la del dispositivo. */
  now?: string;
};

type Notice = { tone: 'info' | 'warning' | 'danger' | 'alert' | 'neutral'; message: string };

function getNotice(session: Session): Notice | null {
  const isTutor = session.myRole === 'tutor';
  switch (session.status) {
    case 'pendiente': {
      const deadline = formatDateTime(requestExpiresAt(session.createdAt));
      return {
        tone: 'warning',
        message: isTutor
          ? `Tienes hasta el ${deadline} para responder esta solicitud.`
          : `Esperando respuesta del tutor. Si no responde antes del ${deadline}, la solicitud expira.`,
      };
    }
    case 'confirmada':
      return { tone: 'info', message: 'Horario reservado. Puedes cancelar hasta la hora de inicio.' };
    case 'pendiente_cierre':
      return {
        tone: 'alert',
        message: `La sesión ya terminó: ambas partes deben declarar el resultado. Si la otra parte no responde en ${CLOSURE_TIMEOUT_HOURS} horas, se acepta la primera declaración.`,
      };
    case 'en_conflicto':
      return {
        tone: 'danger',
        message: 'Las declaraciones no coinciden. La sesión queda bloqueada hasta la revisión de un administrador.',
      };
    case 'rechazada':
    case 'expirada':
      return { tone: 'neutral', message: 'Esta solicitud no se concretó, por lo que no hubo sesión.' };
    default:
      return null;
  }
}

const RESULT_BUTTONS: { label: string; status: SessionStatus }[] = [
  { label: 'La sesión se realizó', status: 'completada' },
  { label: 'La sesión no se realizó', status: 'no_realizada' },
  { label: 'Hubo inasistencia', status: 'inasistencia' },
];

/** CU-09 / CU-10 / CU-11: detalle de sesión con acciones según estado y rol. Maqueta sin backend. */
export default function DetalleSesionScreen({ session, now = new Date().toISOString() }: Props) {
  const theme = useTheme();
  const [pickedRating, setPickedRating] = useState(0);
  const [simulated, setSimulated] = useState<string | null>(null);

  const actions = getAvailableActions({
    status: session.status,
    role: session.myRole,
    startsAt: session.startsAt,
    now,
    alreadyRated: session.myRating !== undefined,
  });
  const has = (a: SessionAction) => actions.includes(a);
  const notice = getNotice(session);
  const simulate = (text: string) => setSimulated(text);

  const iAmTutee = session.myRole === 'tutee';
  const tutorReputation =
    session.tutor.reputation !== null
      ? `★ ${session.tutor.reputation.toFixed(1)} (${session.tutor.ratingsCount})`
      : 'Sin calificaciones';

  return (
    <ScreenContainer>
      {/* Encabezado */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <StatusBadge status={session.status} />
        <ThemedText type="subtitle" style={styles.title}>
          {session.subject.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {session.subject.code} · Participas como {iAmTutee ? 'Tutee' : 'Tutor'}
        </ThemedText>
      </ThemedView>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      {/* Datos de la sesión */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Detalles</ThemedText>
        <InfoRow label="Fecha" value={formatDate(session.startsAt)} />
        <InfoRow label="Horario" value={formatTimeRange(session.startsAt, session.endsAt)} />
        <InfoRow label="Tutor" value={`${session.tutor.name}  ${tutorReputation}`} />
        <InfoRow label="Tutee" value={session.tutee.name} />
      </ThemedView>

      {/* Calificación (solo tiene sentido en sesiones completadas: BR04, BR17) */}
      {session.status === 'completada' ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Calificaciones</ThemedText>
          <View style={styles.ratingRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Recibida
            </ThemedText>
            {session.receivedRating ? (
              <RatingStars value={session.receivedRating} size={18} />
            ) : (
              <ThemedText type="small">Pendiente</ThemedText>
            )}
          </View>
          <View style={styles.ratingRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Tu calificación
            </ThemedText>
            {session.myRating ? (
              <RatingStars value={session.myRating} size={18} />
            ) : (
              <ThemedText type="small">Sin calificar</ThemedText>
            )}
          </View>

          {has('calificar') ? (
            <View style={styles.rateBox}>
              <ThemedText type="small">Califica esta sesión (1 a 5)</ThemedText>
              <RatingStars value={pickedRating} onChange={setPickedRating} size={32} />
              <AppButton
                label="Enviar calificación"
                disabled={pickedRating === 0}
                onPress={() => simulate(`Calificación enviada: ${pickedRating} de 5`)}
              />
            </View>
          ) : null}
        </ThemedView>
      ) : null}

      {/* Historial de estados */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Historial de estados</ThemedText>
        {session.events.map((event, index) => {
          const last = index === session.events.length - 1;
          return (
            <View key={`${event.status}-${event.at}`} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: last ? ACCENT : theme.backgroundSelected },
                  ]}
                />
                {!last ? <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} /> : null}
              </View>
              <View style={styles.timelineText}>
                <ThemedText type="smallBold">{STATUS_META[event.status].label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDateTime(event.at)}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </ThemedView>

      {/* Acciones */}
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {has('aceptar') ? (
            <AppButton label="Aceptar solicitud" onPress={() => simulate('Solicitud aceptada → Confirmada')} />
          ) : null}
          {has('rechazar') ? (
            <AppButton label="Rechazar solicitud" variant="secondary" onPress={() => simulate('Solicitud rechazada')} />
          ) : null}
          {has('cancelar') ? (
            <AppButton label="Cancelar sesión" variant="danger" onPress={() => simulate('Sesión cancelada')} />
          ) : null}
          {has('declarar_resultado')
            ? RESULT_BUTTONS.map((r) => (
                <AppButton
                  key={r.status}
                  label={r.label}
                  variant="secondary"
                  onPress={() => simulate(`Resultado declarado: ${STATUS_META[r.status].label}`)}
                />
              ))
            : null}
          {has('reportar') ? (
            <AppButton label="Reportar usuario" variant="danger" onPress={() => simulate('Reporte enviado')} />
          ) : null}
        </View>
      ) : null}

      {simulated ? (
        <NoticeBanner tone="success" title="Simulación (sin backend)" message={simulated} />
      ) : null}
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, gap: 10 },
  title: { fontSize: 26, lineHeight: 34 },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoLabel: { width: 72 },
  infoValue: { flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rateBox: { gap: 10, paddingTop: 6 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineRail: { alignItems: 'center', width: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  line: { width: 2, flex: 1, marginVertical: 2 },
  timelineText: { flex: 1, paddingBottom: 12 },
  actions: { gap: 10 },
});
