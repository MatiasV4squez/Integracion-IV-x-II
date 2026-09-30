/**
 * Lógica pura (sin React) de las reglas de negocio de sesiones del SRS.
 * Se mantiene aparte de la UI para poder probarla con `npm test`.
 */
import type {
  AvailabilityBlock,
  ClosureResult,
  Material,
  Person,
  Session,
  SessionStatus,
  Subject,
  UserRole,
} from '../types/session';

/** BR05: máximo de solicitudes pendientes por Tutee. */
export const MAX_PENDING_REQUESTS = 4;
/** BR03: horas antes de que una solicitud pendiente expire. */
export const REQUEST_EXPIRY_HOURS = 24;
/** BR18: horas para aceptar provisionalmente la declaración de cierre. */
export const CLOSURE_TIMEOUT_HOURS = 48;

/** BR02: transiciones permitidas. Los estados finales no tienen salida. */
export const TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  pendiente: ['confirmada', 'rechazada', 'expirada'],
  confirmada: ['cancelada', 'pendiente_cierre'],
  pendiente_cierre: ['completada', 'no_realizada', 'inasistencia', 'en_conflicto'],
  en_conflicto: ['completada', 'no_realizada', 'inasistencia'], // solo Administrador
  rechazada: [],
  expirada: [],
  cancelada: [],
  completada: [],
  no_realizada: [],
  inasistencia: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: SessionStatus, to: SessionStatus) {
    super(`Transición no permitida: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Devuelve el nuevo estado o lanza si la transición viola BR02 (CA07). */
export function transition(from: SessionStatus, to: SessionStatus): SessionStatus {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
  return to;
}

export function isFinal(status: SessionStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** BR10: solo se puede reportar si la sesión alguna vez llegó a "Confirmada". */
export function hasReachedConfirmed(status: SessionStatus): boolean {
  return status !== 'pendiente' && status !== 'rechazada' && status !== 'expirada';
}

/** BR05 / RF11: un Tutee no puede tener más de 4 solicitudes pendientes. */
export function canCreateRequest(pendingCount: number): boolean {
  return pendingCount < MAX_PENDING_REQUESTS;
}

/** BR03: fecha límite de respuesta del Tutor para una solicitud pendiente. */
export function requestExpiresAt(createdAtIso: string): string {
  const ms = new Date(createdAtIso).getTime() + REQUEST_EXPIRY_HOURS * 3_600_000;
  return new Date(ms).toISOString();
}

/** BR15: una sesión confirmada solo se cancela antes de su hora de inicio. */
export function canCancel(status: SessionStatus, startsAtIso: string, nowIso: string): boolean {
  return status === 'confirmada' && new Date(nowIso).getTime() < new Date(startsAtIso).getTime();
}

/** Minutos antes del inicio en que se habilita el check-in por QR. */
export const CHECKIN_WINDOW_MINUTES = 15;
/** Lugar por defecto de una tutoría nueva (el Tutor puede acordar otro). */
export const DEFAULT_PLACE = 'Biblioteca UCT · Sala de estudio';

export type CheckInPhase = 'early' | 'open' | 'closed';

/** Ventana de check-in: desde 15 min antes del inicio hasta el término del horario. */
export function getCheckInPhase(startsAtIso: string, endsAtIso: string, nowIso: string): CheckInPhase {
  const now = new Date(nowIso).getTime();
  if (now >= new Date(endsAtIso).getTime()) return 'closed';
  if (now >= new Date(startsAtIso).getTime() - CHECKIN_WINDOW_MINUTES * 60_000) return 'open';
  return 'early';
}

/** BR18: mismas declaraciones -> ese estado final; distintas -> "En conflicto". */
export function resolveClosure(a: ClosureResult, b: ClosureResult): SessionStatus {
  return a === b ? a : 'en_conflicto';
}

export type SessionAction =
  | 'aceptar'
  | 'rechazar'
  | 'cancelar'
  | 'declarar_resultado'
  | 'calificar'
  | 'reportar';

type ActionContext = {
  status: SessionStatus;
  role: UserRole;
  startsAt: string;
  now: string;
  /** El usuario actual ya calificó esta sesión (BR04). */
  alreadyRated: boolean;
  /** El usuario actual ya declaró el resultado de cierre. */
  alreadyDeclared?: boolean;
  /** Ya existe un reporte de esta sesión. */
  alreadyReported?: boolean;
};

/** Acciones que la UI debe ofrecer al usuario según estado, rol y reglas de negocio. */
export function getAvailableActions(ctx: ActionContext): SessionAction[] {
  const actions: SessionAction[] = [];

  switch (ctx.status) {
    case 'pendiente':
      // BR14: solo el Tutor solicitado acepta o rechaza.
      if (ctx.role === 'tutor') actions.push('aceptar', 'rechazar');
      break;
    case 'confirmada':
      if (canCancel(ctx.status, ctx.startsAt, ctx.now)) actions.push('cancelar');
      break;
    case 'pendiente_cierre':
      if (!ctx.alreadyDeclared) actions.push('declarar_resultado');
      break;
    case 'completada':
      // BR04: una sola calificación por participante.
      if (!ctx.alreadyRated) actions.push('calificar');
      break;
    default:
      break;
  }

  if (hasReachedConfirmed(ctx.status) && !ctx.alreadyReported) actions.push('reportar');
  return actions;
}

/* ------------------------------------------------------------------ */
/* Operaciones puras sobre la lista de sesiones (flujo completo)       */
/* La UI las invoca desde el contexto; aquí se pueden probar sin React. */
/* ------------------------------------------------------------------ */

export type FlowState = {
  sessions: Session[];
  /** "Hora actual" simulada (ISO). Avanza un minuto por cada operación. */
  clock: string;
  /** Cupos reservados en esta sesión de uso, por id de bloque. */
  reserved: Record<string, number>;
};

export type FlowResult =
  | { ok: true; state: FlowState; session: Session }
  | { ok: false; error: string };

const MINUTE = 60_000;
const HOUR = 3_600_000;

const fail = (error: string): FlowResult => ({ ok: false, error });

export function advanceClock(clock: string, atLeastIso?: string): string {
  let t = new Date(clock).getTime();
  if (atLeastIso) t = Math.max(t, new Date(atLeastIso).getTime());
  return new Date(t + MINUTE).toISOString();
}

export function countPendingRequests(sessions: Session[]): number {
  return sessions.filter((s) => s.myRole === 'tutee' && s.status === 'pendiente').length;
}

export function blockOccupancy(block: AvailabilityBlock, reserved: Record<string, number> = {}): number {
  return block.enrolled + (reserved[block.id] ?? 0);
}

export function isBlockFull(block: AvailabilityBlock, reserved: Record<string, number> = {}): boolean {
  return blockOccupancy(block, reserved) >= block.capacity;
}

function commit(state: FlowState, session: Session, clock = state.clock, reserved = state.reserved): FlowResult {
  return {
    ok: true,
    session,
    state: { clock, reserved, sessions: state.sessions.map((s) => (s.id === session.id ? session : s)) },
  };
}

function find(state: FlowState, id: string): Session | undefined {
  return state.sessions.find((s) => s.id === id);
}

type MoveOptions = { atLeast?: string; patch?: Partial<Session>; releaseBlock?: boolean };

function moveTo(state: FlowState, id: string, to: SessionStatus, opts: MoveOptions = {}): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (!canTransition(s.status, to)) return fail(`Transición no permitida: ${s.status} → ${to}.`);

  const clock = advanceClock(state.clock, opts.atLeast);
  const next: Session = { ...s, ...opts.patch, status: to, events: [...s.events, { status: to, at: clock }] };

  let reserved = state.reserved;
  const held = s.blockId ? (reserved[s.blockId] ?? 0) : 0;
  if (opts.releaseBlock && s.blockId && held > 0) reserved = { ...reserved, [s.blockId]: held - 1 };
  return commit(state, next, clock, reserved);
}

export type NewRequestInput = {
  tutor: { id: string; name: string; reputation: number | null; ratingsCount: number };
  me: Person;
  subject: Subject;
  block: AvailabilityBlock;
  unit?: string;
  note?: string;
};

/** CU-08: crea una solicitud "Pendiente" validando BR05 y los cupos del bloque. */
export function createRequest(state: FlowState, input: NewRequestInput): FlowResult {
  if (!canCreateRequest(countPendingRequests(state.sessions))) {
    return fail(`Ya tienes ${MAX_PENDING_REQUESTS} solicitudes pendientes. Espera una respuesta antes de crear otra.`);
  }
  if (isBlockFull(input.block, state.reserved)) return fail('Este horario ya no tiene cupos disponibles.');
  const duplicated = state.sessions.some(
    (s) =>
      s.blockId === input.block.id &&
      s.myRole === 'tutee' &&
      (s.status === 'pendiente' || s.status === 'confirmada'),
  );
  if (duplicated) return fail('Ya solicitaste este horario.');

  const clock = advanceClock(state.clock);
  const session: Session = {
    id: `r${state.sessions.length + 1}`,
    place: DEFAULT_PLACE,
    subject: input.subject,
    tutor: input.tutor,
    tutee: input.me,
    myRole: 'tutee',
    status: 'pendiente',
    createdAt: clock,
    startsAt: input.block.startsAt,
    endsAt: input.block.endsAt,
    blockId: input.block.id,
    topic: input.unit,
    requestNote: input.note?.trim() || undefined,
    materials: [],
    events: [{ status: 'pendiente', at: clock }],
  };
  return {
    ok: true,
    session,
    state: {
      clock,
      reserved: { ...state.reserved, [input.block.id]: (state.reserved[input.block.id] ?? 0) + 1 },
      sessions: [session, ...state.sessions],
    },
  };
}

/** RF12 / BR14: el Tutor acepta o rechaza una solicitud pendiente. */
export function respondToRequest(state: FlowState, id: string, accept: boolean): FlowResult {
  return moveTo(state, id, accept ? 'confirmada' : 'rechazada', { releaseBlock: !accept });
}

/** RF15 / BR15: cancelar una sesión confirmada antes de su inicio. */
export function cancelSession(state: FlowState, id: string): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (!canCancel(s.status, s.startsAt, state.clock)) {
    return fail('Solo puedes cancelar una sesión confirmada antes de su hora de inicio.');
  }
  return moveTo(state, id, 'cancelada', { releaseBlock: true });
}

/** BR16: al terminar el horario, la sesión confirmada pasa a "Pendiente de cierre". */
export function endSession(state: FlowState, id: string): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  return moveTo(state, id, 'pendiente_cierre', { atLeast: s.endsAt });
}

/** BR03: una solicitud sin respuesta tras 24 horas expira y libera el cupo. */
export function expireRequest(state: FlowState, id: string): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  return moveTo(state, id, 'expirada', { atLeast: requestExpiresAt(s.createdAt), releaseBlock: true });
}

/** BR17: el usuario declara el resultado. Si la contraparte ya declaró, se resuelve (BR18). */
export function declareResult(state: FlowState, id: string, result: ClosureResult): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (s.status !== 'pendiente_cierre') return fail('Esta sesión no está pendiente de cierre.');
  if (s.declaration?.mine) return fail('Ya declaraste el resultado de esta sesión.');

  const declaration = { ...s.declaration, mine: result };
  if (declaration.theirs) {
    return moveTo(state, id, resolveClosure(result, declaration.theirs), { patch: { declaration } });
  }
  return commit(state, { ...s, declaration });
}

/** (Demo) La contraparte declara su resultado. */
export function counterpartDeclares(state: FlowState, id: string, result: ClosureResult): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (s.status !== 'pendiente_cierre') return fail('Esta sesión no está pendiente de cierre.');
  if (s.declaration?.theirs) return fail('La contraparte ya declaró el resultado.');

  const declaration = { ...s.declaration, theirs: result };
  if (declaration.mine) {
    return moveTo(state, id, resolveClosure(declaration.mine, result), { patch: { declaration } });
  }
  return commit(state, { ...s, declaration });
}

/** BR18: tras 48 horas sin respuesta se acepta provisionalmente la primera declaración. */
export function closureTimeout(state: FlowState, id: string): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (s.status !== 'pendiente_cierre') return fail('Esta sesión no está pendiente de cierre.');
  const first = s.declaration?.mine ?? s.declaration?.theirs;
  if (!first) return fail('Aún nadie declaró el resultado.');
  const after = new Date(new Date(state.clock).getTime() + CLOSURE_TIMEOUT_HOURS * HOUR).toISOString();
  return moveTo(state, id, first, { atLeast: after });
}

/** BR02: solo el Administrador resuelve un conflicto. */
export function adminResolve(state: FlowState, id: string, result: ClosureResult): FlowResult {
  return moveTo(state, id, result);
}

/** RF25 / BR04 / BR19: una calificación entera 1-5 por participante, solo en sesiones completadas. */
export function rateSession(state: FlowState, id: string, rating: number, comment?: string): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (s.status !== 'completada') return fail('Solo se pueden calificar sesiones completadas.');
  if (s.myRating !== undefined) return fail('Ya calificaste esta sesión.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail('La calificación debe ser un entero de 1 a 5.');
  return commit(state, { ...s, myRating: rating, myComment: comment?.trim() || undefined });
}

/** RF22 / BR10: reporte con motivo y descripción, solo si la sesión llegó a "Confirmada". */
export function reportSession(state: FlowState, id: string, reason: string, description: string): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (!hasReachedConfirmed(s.status)) return fail('Solo puedes reportar sesiones que llegaron a estar confirmadas.');
  if (s.report) return fail('Ya enviaste un reporte de esta sesión.');
  if (!reason.trim() || !description.trim()) return fail('Indica el motivo y una descripción del incidente.');
  const clock = advanceClock(state.clock);
  return commit(state, { ...s, report: { reason: reason.trim(), description: description.trim(), at: clock } }, clock);
}

/** Adjuntar guías / ejercicios a una sesión en curso o finalizada. */
export function addMaterial(state: FlowState, id: string, material: Material): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (!['confirmada', 'pendiente_cierre', 'completada'].includes(s.status)) {
    return fail('Solo puedes adjuntar material a sesiones confirmadas o finalizadas.');
  }
  if (!material.title.trim()) return fail('Escribe un título para el material.');
  return commit(state, { ...s, materials: [...s.materials, material] });
}

/** Check-in por QR: registra la asistencia del usuario dentro de la ventana de la sesión. */
export function checkIn(state: FlowState, id: string): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (s.status !== 'confirmada') return fail('Solo se registra asistencia en sesiones confirmadas.');
  if (s.attendance?.mine) return fail('Ya registraste tu asistencia.');
  const phase = getCheckInPhase(s.startsAt, s.endsAt, state.clock);
  if (phase === 'early') return fail(`El check-in se habilita ${CHECKIN_WINDOW_MINUTES} minutos antes del inicio.`);
  if (phase === 'closed') return fail('El horario de la sesión ya terminó.');
  const clock = advanceClock(state.clock);
  return commit(state, { ...s, attendance: { ...s.attendance, mine: clock } }, clock);
}

/** (Demo) La contraparte escanea el QR. */
export function counterpartCheckIn(state: FlowState, id: string): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (s.status !== 'confirmada') return fail('Solo se registra asistencia en sesiones confirmadas.');
  if (s.attendance?.theirs) return fail('La contraparte ya registró su asistencia.');
  const clock = advanceClock(state.clock);
  return commit(state, { ...s, attendance: { ...s.attendance, theirs: clock } }, clock);
}

/** (Demo) Lleva el reloj simulado al inicio del horario para probar el check-in y el temporizador. */
export function startSessionNow(state: FlowState, id: string): FlowResult {
  const s = find(state, id);
  if (!s) return fail('Sesión no encontrada.');
  if (s.status !== 'confirmada') return fail('Solo una sesión confirmada puede iniciarse.');
  return commit(state, s, advanceClock(state.clock, s.startsAt));
}
