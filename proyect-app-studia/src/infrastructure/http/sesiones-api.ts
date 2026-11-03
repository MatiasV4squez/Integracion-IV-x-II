import type { CatalogoRepository, DatosPublicos, SesionesRepository, UsuariosRepository } from '@/application/ports/repositories';
import type { Materia } from '@/domain/catalogo/materia';
import type { Session, SessionStatus } from '@/domain/sesiones/session';

import { materiaPorCodigo } from './catalogo-api';
import { api, currentUserId, SERVICIOS } from './http-client';

/** Sesión tal como la responde agendamiento-sesiones (BIGINT como texto, estados en mayúsculas). */
type SesionApi = {
  id_sesion: string;
  id_tutee: string;
  id_tutor: string;
  id_materia: string;
  id_bloque: string;
  estado_sesion: string;
  inicio: string;
  fin: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  resultado_provisional?: boolean;
  calificaciones?: { id_evaluador: string; id_evaluado: string; puntuacion: number }[];
};

/** Datos de apoyo para armar sesiones: catálogo y nombres de las personas (usuarios-auth). */
type ContextoSesiones = { materias: Materia[]; personas: Map<string, DatosPublicos> };

const nombre = (personas: Map<string, DatosPublicos>, id: string, rol: string) => personas.get(id)?.nombre ?? `${rol} #${id}`;

/** Convierte una sesión del micro al modelo de la app. */
function aSession(s: SesionApi, { materias, personas }: ContextoSesiones): Session {
  const me = currentUserId();
  const materia = materias.find((m) => m.id === s.id_materia);
  const status = s.estado_sesion.toLowerCase() as SessionStatus;
  const mine = s.calificaciones?.find((c) => c.id_evaluador === me);
  const received = s.calificaciones?.find((c) => c.id_evaluado === me);
  return {
    id: s.id_sesion,
    subject: { code: materia?.code ?? s.id_materia, name: materia?.name ?? `Materia #${s.id_materia}` },
    // La reputación del tutor se ve en su perfil (materias-tutores); aquí no se pide por cada sesión.
    tutor: { id: s.id_tutor, name: nombre(personas, s.id_tutor, 'Tutor'), reputation: null, ratingsCount: 0 },
    tutee: { id: s.id_tutee, name: nombre(personas, s.id_tutee, 'Estudiante') },
    myRole: s.id_tutor === me ? 'tutor' : 'tutee',
    status,
    createdAt: s.fecha_creacion,
    startsAt: s.inicio,
    endsAt: s.fin,
    blockId: s.id_bloque,
    materials: [],
    myRating: mine?.puntuacion,
    receivedRating: received?.puntuacion,
    events: [
      { status: 'pendiente', at: s.fecha_creacion },
      ...(status !== 'pendiente' ? [{ status, at: s.fecha_actualizacion }] : []),
    ],
  };
}

const ruta = (id: string, accion: string) => `${SERVICIOS.sesiones}/sessions/${encodeURIComponent(id)}/${accion}`;

/** Contraparte del usuario actual dentro de la sesión. */
const contraparte = (session: Session) => (session.myRole === 'tutee' ? session.tutor.id : session.tutee.id);

/**
 * Adaptador del puerto SesionesRepository: agendamiento-sesiones (sesiones, cierre y calificación)
 * y reportes-moderacion (reportes). Los nombres salen de usuarios-auth y las materias del catálogo.
 */
export function createHttpSesionesRepository(deps: { catalogo: CatalogoRepository; usuarios: UsuariosRepository }): SesionesRepository {
  return {
    /** GET /sessions/history — sesiones del usuario como tutor o tutee (el filtro lo aplica la aplicación). */
    async listar(signal) {
      const historial = await api.get<SesionApi[]>(`${SERVICIOS.sesiones}/sessions/history`, undefined, signal);
      const [materias, personas] = await Promise.all([
        deps.catalogo.listar(signal),
        deps.usuarios.datosPublicos(historial.flatMap((s) => [s.id_tutor, s.id_tutee]), signal),
      ]);
      return historial.map((s) => aSession(s, { materias, personas }));
    },

    /** POST /sessions — crea la solicitud (sesión PENDIENTE) y reserva el bloque en materias-tutores. */
    async solicitar(input) {
      const materia = await materiaPorCodigo(deps.catalogo, input.subject.code);
      const sesion = await api.post<SesionApi>(`${SERVICIOS.sesiones}/sessions`, {
        id_tutor: input.tutor.id,
        id_materia: materia.id,
        id_bloque: input.block.id,
      });
      return aSession(sesion, { materias: [materia], personas: new Map() });
    },

    /** PATCH /sessions/:id/accept | reject — el tutor responde una solicitud. */
    async responder(id, accept) {
      await api.patch(ruta(id, accept ? 'accept' : 'reject'));
    },

    async cancelar(id) {
      await api.patch(ruta(id, 'cancel'));
    },

    /**
     * POST /sessions/:id/closure-declarations — declaración de cierre (BR17). Quien declara
     * "inasistencia" se refiere a la contraparte, y el micro exige indicar quién faltó.
     */
    async declarar(session, result) {
      await api.post(ruta(session.id, 'closure-declarations'), {
        resultado_declarado: result.toUpperCase(),
        ...(result === 'inasistencia' ? { id_usuario_inasistente: contraparte(session) } : {}),
      });
    },

    /** POST /sessions/:id/ratings — calificación de 1 a 5 (el micro no guarda comentarios). */
    async calificar(id, puntuacion) {
      await api.post(ruta(id, 'ratings'), { puntuacion });
    },

    /** POST /reportes-moderacion/reportes — el reportador sale del JWT; el micro valida que ambos participaron. */
    async reportar(session, reason, description) {
      await api.post(`${SERVICIOS.reportes}/reportes`, {
        titulo: reason,
        descripcion: description,
        id_sesion: session.id,
        id_usuario_reportado: contraparte(session),
      });
    },
  };
}
