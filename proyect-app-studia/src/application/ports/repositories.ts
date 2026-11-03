/**
 * Puertos de datos de la aplicación. Cada uno tiene un adaptador HTTP (API Gateway) y, cuando la demo
 * lo necesita, uno con datos de ejemplo. La raíz de composición (`src/di`) elige cuál usar.
 */
import type { Perfil } from '@/domain/auth/perfil';
import type { User } from '@/domain/auth/auth';
import type { Materia } from '@/domain/catalogo/materia';
import type { Certificado, Postulacion } from '@/domain/postulaciones/postulacion';
import type { ClosureResult, MyAvailabilityBlock, Session, SolicitudInput, Tutor } from '@/domain/sesiones/session';
import type { Page } from '@/shared/pagination';

export interface CatalogoRepository {
  listar(signal?: AbortSignal): Promise<Materia[]>;
}

export interface TutoresRepository {
  /** Tutores (con horarios disponibles) que enseñan una materia, paginados. */
  buscarPorMateria(params: { subjectCode: string; page: number; pageSize: number }, signal?: AbortSignal): Promise<Page<Tutor>>;
  /** Perfil público de un tutor. */
  obtener(id: string, signal?: AbortSignal): Promise<Tutor>;
}

export interface SesionesRepository {
  /** Todas las sesiones del usuario (como estudiante y como tutor). */
  listar(signal?: AbortSignal): Promise<Session[]>;
  solicitar(input: SolicitudInput): Promise<Session>;
  responder(id: string, accept: boolean): Promise<void>;
  cancelar(id: string): Promise<void>;
  declarar(session: Session, result: ClosureResult): Promise<void>;
  calificar(id: string, puntuacion: number): Promise<void>;
  reportar(session: Session, reason: string, description: string): Promise<void>;
}

/** Bloque con día y horas locales de Chile ("YYYY-MM-DD", "HH:MM"). */
export type BloqueHorario = { dia: string; horaInicio: string; horaFin: string };

export interface DisponibilidadRepository {
  misBloques(signal?: AbortSignal): Promise<MyAvailabilityBlock[]>;
  publicar(bloque: BloqueHorario): Promise<void>;
  actualizar(id: string, bloque: BloqueHorario): Promise<void>;
  desactivar(id: string): Promise<void>;
}

export interface PerfilRepository {
  obtener(user: User, signal?: AbortSignal): Promise<Perfil>;
}

export interface PostulacionesRepository {
  mias(signal?: AbortSignal): Promise<Postulacion[]>;
  postular(idMateria: string, certificado: Certificado): Promise<Postulacion>;
  pendientes(signal?: AbortSignal): Promise<Postulacion[]>;
  aprobar(id: string, notaAcreditada: number): Promise<Postulacion>;
  rechazar(id: string, motivoRechazo: string): Promise<Postulacion>;
  reintentarRol(id: string): Promise<Postulacion>;
  /** Descarga el certificado y lo entrega al usuario (ver o guardar). */
  descargarCertificado(postulacion: Postulacion): Promise<void>;
}

/** Datos públicos de otros usuarios (nombre, carrera, semestre, biografía). */
export type DatosPublicos = { id: string; nombre: string; carrera: string | null; semestre_actual: number | null; biografia: string | null };

export interface UsuariosRepository {
  /** Nunca falla: si el servicio no responde, devuelve un mapa vacío y se muestran IDs. */
  datosPublicos(ids: string[], signal?: AbortSignal): Promise<Map<string, DatosPublicos>>;
}
