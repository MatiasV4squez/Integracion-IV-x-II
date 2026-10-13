import type { Sesion } from '../../dominio/entidades/sesion';
import type { Calificacion } from '../../dominio/entidades/calificacion';
import type { DeclaracionCierre } from '../../dominio/entidades/declaracion-cierre';
import type { EstadoSesion } from '../../dominio/tipos/estado-sesion';
import type { NuevaSesion } from '../contratos/entradas-sesion';

export interface RepositorioSesiones {
  contarPendientes(idEstudiante: bigint): Promise<number>;
  existeCompromiso(solicitud: NuevaSesion): Promise<boolean>;
  existeSesionActivaEnBloque(idBloque: bigint): Promise<boolean>;
  crearPendiente(solicitud: NuevaSesion): Promise<Sesion>;
  buscarPorId(id: bigint): Promise<Sesion | null>;
  consultarHistorial(
    idUsuario: bigint,
  ): Promise<Array<Sesion & { calificaciones: Calificacion[] }>>;
  existeSolapamiento(sesion: Sesion): Promise<boolean>;
  haComenzado(inicio: Date): Promise<boolean>;
  cambiarEstado(
    sesion: Sesion,
    nuevoEstado: EstadoSesion,
    provisional: boolean,
  ): Promise<Sesion | null>;
  buscarPendientesVencidas(limite: Date): Promise<Sesion[]>;
  expirarSiSiguePendiente(id: bigint, limite: Date): Promise<boolean>;
  cerrarConfirmadasTerminadas(ahora: Date): Promise<void>;
  buscarCierresVencidos(limite: Date): Promise<Array<{ id_sesion: bigint }>>;
  buscarConDeclaraciones(
    id: bigint,
  ): Promise<(Sesion & { declaraciones: DeclaracionCierre[] }) | null>;
}
