import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AttendanceCard } from '@/components/attendance-card';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { FilterChip } from '@/components/filter-chip';
import { MATERIAL_KINDS, MaterialItem } from '@/components/material-item';
import { NoticeBanner } from '@/components/notice-banner';
import { RatingStars } from '@/components/rating-stars';
import { ScreenContainer } from '@/components/screen-container';
import { SessionTimerCard } from '@/components/session-timer-card';
import { TextField } from '@/components/text-field';
import { TicketCard } from '@/components/ticket-card';
import { TicketHeader } from '@/components/ticket-header';
import { Txt } from '@/components/txt';
import { STATUS_META } from '@/constants/session-status';
import { useUI } from '@/hooks/use-ui';
import { ME } from '@/mocks/sessions';
import { getTutorById } from '@/mocks/tutors';
import { useSessions } from '@/state/sessions-context';
import type { ClosureResult, MaterialKind, Session } from '@/types/session';
import { formatDateTime, formatDayLong, formatTime, plural } from '@/utils/format';
import {
  addMaterial,
  adminResolve,
  cancelSession,
  checkIn,
  closureTimeout,
  CLOSURE_TIMEOUT_HOURS,
  counterpartCheckIn,
  counterpartDeclares,
  declareResult,
  endSession,
  expireRequest,
  getAvailableActions,
  getCheckInPhase,
  rateSession,
  reportSession,
  requestExpiresAt,
  respondToRequest,
  startSessionNow,
  type FlowResult,
} from '@/utils/session-machine';

type Props = { sessionId?: string };

const RESULTS: { key: ClosureResult; label: string }[] = [
  { key: 'completada', label: 'La sesión se realizó' },
  { key: 'no_realizada', label: 'La sesión no se realizó' },
  { key: 'inasistencia', label: 'Hubo inasistencia' },
];

const REPORT_REASONS = ['Falta de respeto', 'Impuntualidad o inasistencia', 'Contenido inapropiado', 'Otro'];

/** CU-09 / CU-10 / CU-11: detalle de sesión con contenido, materiales, acciones por estado y panel de demo. */
export default function DetalleSesionScreen({ sessionId }: Props) {
  const router = useRouter();
  const ui = useUI();
  const { sessions, now, run, lastViewedId, setLastViewed } = useSessions();

  const session =
    sessions.find((s) => s.id === sessionId) ?? sessions.find((s) => s.id === lastViewedId) ?? sessions.find((s) => s.status === 'confirmada') ?? sessions[0];

  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialKind, setMaterialKind] = useState<MaterialKind>('guia');
  const [materialTitle, setMaterialTitle] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (session) setLastViewed(session.id);
  }, [session, setLastViewed]);

  // Al cambiar de sesión se limpian los formularios.
  useEffect(() => {
    setFeedback(null);
    setRating(0);
    setComment('');
    setShowMaterialForm(false);
    setShowReport(false);
    setReason(null);
    setDescription('');
  }, [session?.id]);

  if (!session) {
    return (
      <ScreenContainer>
        <EmptyState icon="📄" title="No hay sesiones para mostrar" message="Solicita una tutoría y aparecerá aquí." />
        <AppButton label="Solicitar tutoría" onPress={() => router.navigate('/solicitud')} />
      </ScreenContainer>
    );
  }

  const id = session.id;
  const iAmTutee = session.myRole === 'tutee';
  const counterpart = iAmTutee ? session.tutor : session.tutee;
  const tutorProfile = getTutorById(session.tutor.id);
  const actions = getAvailableActions({
    status: session.status,
    role: session.myRole,
    startsAt: session.startsAt,
    now,
    alreadyRated: session.myRating !== undefined,
    alreadyDeclared: !!session.declaration?.mine,
    alreadyReported: !!session.report,
  });
  const has = (a: (typeof actions)[number]) => actions.includes(a);

  const act = (op: Parameters<typeof run>[0], okText: string) => {
    const res: FlowResult = run(op);
    setFeedback({ ok: res.ok, text: res.ok ? okText : res.error });
    return res.ok;
  };

  const submitRating = () => {
    if (act((s) => rateSession(s, id, rating, comment), '¡Gracias! Tu calificación quedó registrada y no se puede editar.')) {
      setRating(0);
      setComment('');
    }
  };

  const submitReport = () => {
    if (act((s) => reportSession(s, id, reason ?? '', description), 'Reporte enviado. Quedó Pendiente de revisión por un administrador.')) {
      setShowReport(false);
      setReason(null);
      setDescription('');
    }
  };

  const submitMaterial = () => {
    const kindLabel = MATERIAL_KINDS.find((k) => k.key === materialKind)?.label ?? 'Material';
    const ok = act(
      (s) =>
        addMaterial(s, id, {
          id: `${id}-m${session.materials.length + 1}`,
          title: materialTitle || `${kindLabel} ${session.materials.length + 1}`,
          kind: materialKind,
          meta: 'PDF · demo',
          uploadedBy: ME.name,
        }),
      'Material subido a la sesión.',
    );
    if (ok) {
      setMaterialTitle('');
      setShowMaterialForm(false);
    }
  };

  const canUpload = ['confirmada', 'pendiente_cierre', 'completada'].includes(session.status);
  const openTutorProfile = () => router.push({ pathname: '/tutor/[id]', params: { id: session.tutor.id, subject: session.subject.code } });

  const { mine, theirs } = session.declaration ?? {};
  const notice = getNotice(session, mine, theirs);
  const phase = getCheckInPhase(session.startsAt, session.endsAt, now);
  const showQr = ['confirmada', 'pendiente_cierre', 'completada'].includes(session.status);
  const showTimer = session.status === 'pendiente' || session.status === 'confirmada';
  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/historial'));

  return (
    <View style={[styles.flex, { backgroundColor: ui.bg }]}>
      <TicketHeader title="Detalle de sesión" subtitle={`Tutoría · ${session.subject.code}`} status={session.status} onBack={goBack} />
      <ScreenContainer>
        {/* Ticket: materia, rol, lugar y horario */}
        <TicketCard
          overline={`UCT Tutorías · ${session.subject.code}`}
          title={session.subject.name}
          subtitle={formatDayLong(session.startsAt)}
          chipLabel="Tu rol"
          chipValue={iAmTutee ? 'Tutee' : 'Tutor'}
          columns={[
            { label: 'Lugar', value: session.place ?? 'Por definir', flex: 1.9 },
            { label: 'Inicio', value: formatTime(session.startsAt) },
            { label: 'Término', value: formatTime(session.endsAt) },
          ]}
        />

        {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}
        {session.report ? (
          <NoticeBanner tone="warning" title="Reporte enviado" message={`Motivo: ${session.report.reason}. Pendiente de revisión por un administrador.`} />
        ) : null}
        {feedback ? <NoticeBanner tone={feedback.ok ? 'success' : 'danger'} message={feedback.text} /> : null}

        {showTimer ? <SessionTimerCard session={session} now={now} /> : null}
        {showQr ? (
          <AttendanceCard
            session={session}
            phase={phase}
            onCheckIn={() => act((st) => checkIn(st, id), '¡Asistencia registrada! Quedó respaldada con el QR de la sesión.')}
          />
        ) : null}

        {/* Acciones */}
        {actions.some((a) => a !== 'reportar') || has('reportar') ? (
          <Card>
            <Txt variant="h3">Acciones</Txt>
            {has('aceptar') ? (
              <AppButton
                label="Aceptar solicitud"
                onPress={() => act((s) => respondToRequest(s, id, true), 'Solicitud aceptada: la sesión quedó Confirmada.')}
              />
            ) : null}
            {has('rechazar') ? (
              <AppButton label="Rechazar solicitud" variant="secondary" onPress={() => act((s) => respondToRequest(s, id, false), 'Solicitud rechazada.')} />
            ) : null}
            {has('cancelar') ? (
              <AppButton
                label="Cancelar sesión"
                variant="danger"
                onPress={() => act((s) => cancelSession(s, id), 'Sesión cancelada. El cupo quedó liberado.')}
              />
            ) : null}
            {has('declarar_resultado') ? (
              <>
                <Txt variant="small" color="muted">
                  ¿Cómo resultó la sesión?
                </Txt>
                {RESULTS.map((r) => (
                  <AppButton
                    key={r.key}
                    label={r.label}
                    variant="secondary"
                    onPress={() => act((s) => declareResult(s, id, r.key), `Declaraste: ${STATUS_META[r.key].label}.`)}
                  />
                ))}
              </>
            ) : null}
            {has('reportar') ? (
              <>
                <AppButton label={showReport ? 'Cancelar reporte' : 'Reportar usuario'} variant="danger" onPress={() => setShowReport((v) => !v)} />
                {showReport ? (
                  <View style={[styles.form, { backgroundColor: ui.surfaceAlt }]}>
                    <Txt variant="label">Motivo</Txt>
                    <View style={styles.wrapRow}>
                      {REPORT_REASONS.map((r) => (
                        <FilterChip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
                      ))}
                    </View>
                    <TextField placeholder="Describe lo ocurrido" value={description} onChangeText={setDescription} multiline />
                    <AppButton label="Enviar reporte" variant="danger" disabled={!reason || !description.trim()} onPress={submitReport} />
                  </View>
                ) : null}
              </>
            ) : null}
          </Card>
        ) : null}

        {/* Participantes */}
        <Card>
          <Txt variant="h3">Participantes</Txt>
          <Person
            name={session.tutor.name}
            role="Tutor"
            extra={
              session.tutor.reputation !== null
                ? `★ ${session.tutor.reputation.toFixed(1)} · ${plural(session.tutor.ratingsCount, 'reseña', 'reseñas')}`
                : 'Sin reseñas aún'
            }
            action={tutorProfile && iAmTutee ? <AppButton label="Ver perfil" size="sm" variant="secondary" onPress={openTutorProfile} /> : undefined}
          />
          <Person name={session.tutee.name} role="Tutee" />
          <Info label="Solicitada" value={formatDateTime(session.createdAt)} />
          {session.topic ? <Info label="Unidad" value={session.topic} /> : null}
        </Card>

        {/* Contenido */}
        <Card>
          <Txt variant="h3">Contenido de la tutoría</Txt>
          {session.requestNote ? (
            <View style={styles.gap2}>
              <Txt variant="caption" color="muted">
                {iAmTutee ? 'LO QUE PEDISTE REFORZAR' : 'LO QUE PIDIÓ REFORZAR'}
              </Txt>
              <Txt variant="body">“{session.requestNote}”</Txt>
            </View>
          ) : null}
          {session.notes ? (
            <View style={styles.gap2}>
              <Txt variant="caption" color="muted">
                RESUMEN DE LA SESIÓN
              </Txt>
              <Txt variant="body">{session.notes}</Txt>
            </View>
          ) : null}
          {!session.requestNote && !session.notes ? (
            <Txt variant="small" color="muted">
              Aún no hay resumen. Se agregará cuando se realice la tutoría.
            </Txt>
          ) : null}

          <View style={[styles.divider, { backgroundColor: ui.border }]} />
          <View style={styles.between}>
            <Txt variant="label">Guías y ejercicios ({session.materials.length})</Txt>
            {canUpload ? (
              <AppButton label={showMaterialForm ? 'Cancelar' : '+ Subir'} size="sm" variant="secondary" onPress={() => setShowMaterialForm((v) => !v)} />
            ) : null}
          </View>

          {showMaterialForm ? (
            <View style={[styles.form, { backgroundColor: ui.surfaceAlt }]}>
              <View style={styles.wrapRow}>
                {MATERIAL_KINDS.map((k) => (
                  <FilterChip key={k.key} label={`${k.icon} ${k.label}`} selected={materialKind === k.key} onPress={() => setMaterialKind(k.key)} />
                ))}
              </View>
              <TextField placeholder="Título (ej: Guía 4: Derivadas)" value={materialTitle} onChangeText={setMaterialTitle} />
              <AppButton label="Adjuntar (simulado)" onPress={submitMaterial} />
            </View>
          ) : null}

          {session.materials.length > 0 ? (
            session.materials.map((m) => (
              <MaterialItem key={m.id} material={m} onPress={() => setFeedback({ ok: true, text: `Abriendo “${m.title}” (demo, sin archivo real).` })} />
            ))
          ) : (
            <Txt variant="small" color="muted">
              {canUpload ? 'Todavía no se han subido guías ni ejercicios.' : 'Se podrá subir material cuando la sesión esté confirmada.'}
            </Txt>
          )}
        </Card>

        {/* Calificación */}
        {session.status === 'completada' ? (
          <Card>
            <Txt variant="h3">Calificaciones</Txt>
            <View style={styles.between}>
              <Txt variant="small" color="muted">
                Recibida
              </Txt>
              {session.receivedRating ? <RatingStars value={session.receivedRating} size={18} /> : <Txt variant="small">Pendiente</Txt>}
            </View>
            <View style={styles.between}>
              <Txt variant="small" color="muted">
                Tu calificación
              </Txt>
              {session.myRating ? <RatingStars value={session.myRating} size={18} /> : <Txt variant="small">Sin calificar</Txt>}
            </View>
            {session.myComment ? (
              <Txt variant="small" color="muted">
                “{session.myComment}”
              </Txt>
            ) : null}

            {has('calificar') ? (
              <View style={[styles.form, { backgroundColor: ui.surfaceAlt }]}>
                <Txt variant="label">Califica esta sesión (1 a 5)</Txt>
                <RatingStars value={rating} onChange={setRating} size={34} />
                <TextField placeholder="Comentario (opcional)" value={comment} onChangeText={setComment} multiline />
                <AppButton label="Enviar calificación" disabled={rating === 0} onPress={submitRating} />
              </View>
            ) : null}
          </Card>
        ) : null}

        {/* Historial de estados */}
        <Card>
          <Txt variant="h3">Historial de estados</Txt>
          {session.events.map((event, index) => {
            const last = index === session.events.length - 1;
            return (
              <View key={`${event.status}-${event.at}`} style={styles.timelineRow}>
                <View style={styles.rail}>
                  <View style={[styles.dot, { backgroundColor: last ? ui.primary : ui.border }]} />
                  {!last ? <View style={[styles.line, { backgroundColor: ui.border }]} /> : null}
                </View>
                <View style={styles.timelineText}>
                  <Txt variant="label">{STATUS_META[event.status].label}</Txt>
                  <Txt variant="caption" color="muted">
                    {formatDateTime(event.at)}
                  </Txt>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Siguiente paso */}
        {iAmTutee ? (
          <Card>
            <Txt variant="h3">¿Qué sigue?</Txt>
            {tutorProfile ? (
              <AppButton
                label={`Solicitar otra tutoría con ${session.tutor.name.split(' ')[0]}`}
                onPress={() => router.navigate({ pathname: '/solicitud', params: { tutor: session.tutor.id, subject: session.subject.code } })}
              />
            ) : null}
            <AppButton
              label={`Buscar otro tutor de ${session.subject.name}`}
              variant="secondary"
              onPress={() => router.navigate({ pathname: '/solicitud', params: { subject: session.subject.code } })}
            />
            <AppButton label="Volver al historial" variant="ghost" onPress={() => router.navigate('/historial')} />
          </Card>
        ) : (
          <AppButton label="Volver al historial" variant="secondary" onPress={() => router.navigate('/historial')} />
        )}

        {/* Panel de demostración: simula lo que haría el backend / la contraparte */}
        <Card>
          <View style={styles.between}>
            <View style={styles.flex}>
              <Txt variant="h3">🧪 Panel de demostración</Txt>
              <Txt variant="caption" color="muted">
                Simula eventos del backend para probar el flujo completo. Se quita al conectar la API.
              </Txt>
            </View>
            <AppButton label={showDemo ? 'Ocultar' : 'Mostrar'} size="sm" variant="secondary" onPress={() => setShowDemo((v) => !v)} />
          </View>
          {showDemo ? (
            <View style={styles.gap8}>
              {session.status === 'pendiente' ? (
                <>
                  {iAmTutee ? (
                    <>
                      <AppButton
                        label="El tutor acepta la solicitud"
                        variant="secondary"
                        onPress={() => act((s) => respondToRequest(s, id, true), 'Simulado: el tutor aceptó.')}
                      />
                      <AppButton
                        label="El tutor rechaza la solicitud"
                        variant="secondary"
                        onPress={() => act((s) => respondToRequest(s, id, false), 'Simulado: el tutor rechazó.')}
                      />
                    </>
                  ) : null}
                  <AppButton
                    label={`Pasan ${24} h sin respuesta (expira)`}
                    variant="secondary"
                    onPress={() => act((s) => expireRequest(s, id), 'Simulado: la solicitud expiró y el cupo se liberó.')}
                  />
                </>
              ) : null}
              {session.status === 'confirmada' ? (
                <>
                  <AppButton
                    label="Inicia el horario de la sesión (habilita el check-in)"
                    variant="secondary"
                    onPress={() => act((s) => startSessionNow(s, id), 'Simulado: la sesión comenzó. Ya puedes registrar tu asistencia.')}
                  />
                  <AppButton
                    label="La contraparte escanea el QR"
                    variant="secondary"
                    onPress={() => act((s) => counterpartCheckIn(s, id), 'Simulado: la contraparte registró su asistencia.')}
                  />
                  <AppButton
                    label="Termina el horario de la sesión"
                    variant="secondary"
                    onPress={() => act((s) => endSession(s, id), 'Simulado: la sesión pasó a Pendiente de cierre.')}
                  />
                </>
              ) : null}
              {session.status === 'pendiente_cierre' ? (
                <>
                  {!theirs ? (
                    mine ? (
                      <>
                        <AppButton
                          label="La contraparte declara lo mismo"
                          variant="secondary"
                          onPress={() => act((s) => counterpartDeclares(s, id, mine), 'Simulado: coinciden las declaraciones.')}
                        />
                        <AppButton
                          label="La contraparte declara algo distinto"
                          variant="secondary"
                          onPress={() =>
                            act(
                              (s) => counterpartDeclares(s, id, mine === 'completada' ? 'inasistencia' : 'completada'),
                              'Simulado: declaraciones contradictorias.',
                            )
                          }
                        />
                      </>
                    ) : (
                      <AppButton
                        label="La contraparte declara “Completada”"
                        variant="secondary"
                        onPress={() => act((s) => counterpartDeclares(s, id, 'completada'), 'Simulado: la contraparte declaró Completada.')}
                      />
                    )
                  ) : null}
                  {mine || theirs ? (
                    <AppButton
                      label={`Pasan ${CLOSURE_TIMEOUT_HOURS} h sin respuesta`}
                      variant="secondary"
                      onPress={() => act((s) => closureTimeout(s, id), 'Simulado: se aceptó provisionalmente la primera declaración.')}
                    />
                  ) : null}
                </>
              ) : null}
              {session.status === 'en_conflicto' ? (
                <AppButton
                  label="El administrador resuelve: Completada"
                  variant="secondary"
                  onPress={() => act((s) => adminResolve(s, id, 'completada'), 'Simulado: el administrador resolvió el conflicto.')}
                />
              ) : null}
              {['completada', 'cancelada', 'rechazada', 'expirada', 'no_realizada', 'inasistencia'].includes(session.status) ? (
                <Txt variant="small" color="muted">
                  Este es un estado final: no admite más transiciones (BR02).
                </Txt>
              ) : null}
            </View>
          ) : null}
        </Card>
      </ScreenContainer>
    </View>
  );
}

function getNotice(session: Session, mine?: ClosureResult, theirs?: ClosureResult) {
  const isTutor = session.myRole === 'tutor';
  switch (session.status) {
    case 'pendiente': {
      const deadline = formatDateTime(requestExpiresAt(session.createdAt));
      return {
        tone: 'warning' as const,
        message: isTutor
          ? `Tienes hasta el ${deadline} para responder esta solicitud.`
          : `Esperando respuesta del tutor. Si no responde antes del ${deadline}, la solicitud expira.`,
      };
    }
    case 'confirmada':
      return { tone: 'info' as const, message: 'Horario reservado. Puedes cancelar hasta la hora de inicio.' };
    case 'pendiente_cierre':
      if (mine) {
        return {
          tone: 'alert' as const,
          message: `Declaraste “${STATUS_META[mine].label}”. Esperando a la contraparte: si no responde en ${CLOSURE_TIMEOUT_HOURS} h, se acepta tu declaración.`,
        };
      }
      if (theirs) {
        return { tone: 'alert' as const, message: `La contraparte declaró “${STATUS_META[theirs].label}”. Declara tu resultado para cerrar la sesión.` };
      }
      return {
        tone: 'alert' as const,
        message:
          `La sesión ya terminó: ambas partes deben declarar el resultado. Si la otra parte no responde en ${CLOSURE_TIMEOUT_HOURS} h, se acepta la primera declaración.` +
          (session.attendance?.mine && session.attendance?.theirs
            ? ' Ambos registraron asistencia con el QR: lo esperable es declarar “La sesión se realizó”.'
            : ''),
      };
    case 'en_conflicto':
      return { tone: 'danger' as const, message: 'Las declaraciones no coinciden. La sesión queda bloqueada hasta la revisión de un administrador.' };
    case 'rechazada':
    case 'expirada':
      return { tone: 'neutral' as const, message: 'Esta solicitud no se concretó, por lo que no hubo sesión.' };
    default:
      return null;
  }
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Txt variant="small" color="muted" style={styles.infoLabel}>
        {label}
      </Txt>
      <Txt variant="small" style={styles.flex}>
        {value}
      </Txt>
    </View>
  );
}

function Person({ name, role, extra, action }: { name: string; role: string; extra?: string; action?: ReactNode }) {
  return (
    <View style={styles.personRow}>
      <Avatar name={name} size={40} />
      <View style={styles.flex}>
        <Txt variant="label">{name}</Txt>
        <Txt variant="caption" color="muted">
          {role}
          {extra ? ` · ${extra}` : ''}
        </Txt>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  topic: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  divider: { height: 1, marginVertical: 4 },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoLabel: { width: 76 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gap2: { gap: 2 },
  gap8: { gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  form: { padding: 12, borderRadius: 14, gap: 10 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  line: { width: 2, flex: 1, marginVertical: 2 },
  timelineText: { flex: 1, paddingBottom: 12 },
});
