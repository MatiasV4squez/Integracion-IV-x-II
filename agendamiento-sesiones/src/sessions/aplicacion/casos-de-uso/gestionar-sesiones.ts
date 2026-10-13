import type { Sesion } from '../../dominio/entidades/sesion';
import type { EstadoSesion } from '../../dominio/tipos/estado-sesion';
import { ErrorSesion } from '../../dominio/errores/error-sesion';
import { interpretarIdentificador, validarTransicion, validarParticipante, validarEstado, validarTutor, ESTADOS_OCUPADOS } from '../../dominio/reglas/reglas-sesion';
import type { EntradaCrearSesion, EntradaCalificarSesion, EntradaDeclararCierre, EntradaResolverConflicto, NuevaSesion } from '../contratos/entradas-sesion';
import type { UnidadDeTrabajo, ContextoTransaccion } from '../puertos/unidad-de-trabajo.puerto';
import type { RepositorioSesiones } from '../puertos/repositorio-sesiones.puerto';
import type { RepositorioCalificaciones } from '../puertos/repositorio-calificaciones.puerto';
import type { EntregaReputacion, RegistroAplicacion, LiberacionBloques, EntregaAvisosModeracion } from '../puertos/servicios-aplicacion.puerto';
import type { DisponibilidadTutores } from '../puertos/disponibilidad-tutores.puerto';

// Servicio de aplicación: sus métodos representan los casos de uso de entrada.
export class GestionarSesiones {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo,
    private readonly sesiones: RepositorioSesiones,
    private readonly calificaciones: RepositorioCalificaciones,
    private readonly reputacion: EntregaReputacion,
    private readonly registro: RegistroAplicacion,
    private readonly disponibilidad: DisponibilidadTutores,
    private readonly liberaciones: LiberacionBloques,
    private readonly avisosModeracion: EntregaAvisosModeracion,
  ) {}

  async crearSesion(
    entrada: EntradaCrearSesion,
    idUsuario: string,
  ): Promise<Sesion> {
    const idTutor = interpretarIdentificador(entrada.id_tutor, 'id_tutor');
    const idEstudiante = interpretarIdentificador(idUsuario, 'id_usuario');
    const idMateria = interpretarIdentificador(
      entrada.id_materia,
      'id_materia',
    );
    const idBloque = interpretarIdentificador(entrada.id_bloque, 'id_bloque');
    if (idTutor === idEstudiante) {
      throw new ErrorSesion(
        'ENTRADA_INVALIDA',
        'No puedes solicitar una tutoría contigo mismo.',
      );
    }
    if ((await this.sesiones.contarPendientes(idEstudiante)) >= 4) {
      throw new ErrorSesion(
        'CONFLICTO',
        'Solo puedes mantener cuatro solicitudes pendientes.',
      );
    }
    const bloque = await this.disponibilidad.consultarBloque(
      idTutor,
      idMateria,
      idBloque,
    );
    if (
      bloque.id_tutor !== idTutor ||
      bloque.id_bloque !== idBloque ||
      !Number.isFinite(bloque.inicio.getTime()) ||
      !Number.isFinite(bloque.fin.getTime()) ||
      bloque.fin <= bloque.inicio
    ) {
      throw new ErrorSesion(
        'DEPENDENCIA_NO_DISPONIBLE',
        'Materias-tutores devolvió un bloque inválido.',
      );
    }
    const solicitud: NuevaSesion = {
      id_tutor: idTutor,
      id_tutee: idEstudiante,
      id_materia: idMateria,
      id_bloque: idBloque,
      inicio: bloque.inicio,
      fin: bloque.fin,
    };
    await this.unidadDeTrabajo.ejecutar((contexto) =>
      this.validarNuevaSolicitud(contexto.sesiones, solicitud),
    );
    await this.disponibilidad.reservar(idBloque);
    try {
      return await this.unidadDeTrabajo.ejecutar(async (contexto) => {
        await this.validarNuevaSolicitud(contexto.sesiones, solicitud);
        return contexto.sesiones.crearPendiente(solicitud);
      });
    } catch (error: unknown) {
      try {
        await this.disponibilidad.liberar(idBloque);
      } catch {
        this.registro.error(
          `No se pudo compensar la reserva del bloque ${idBloque} después de fallar la creación.`,
        );
        throw new ErrorSesion(
          'DEPENDENCIA_NO_DISPONIBLE',
          'No se pudo completar la solicitud ni liberar su bloque.',
        );
      }
      throw error;
    }
  }

  private async validarNuevaSolicitud(
    repositorio: RepositorioSesiones,
    solicitud: NuevaSesion,
  ): Promise<void> {
    if ((await repositorio.contarPendientes(solicitud.id_tutee)) >= 4) {
      throw new ErrorSesion(
        'CONFLICTO',
        'Solo puedes mantener cuatro solicitudes pendientes.',
      );
    }
    if (await repositorio.haComenzado(solicitud.inicio)) {
      throw new ErrorSesion(
        'CONFLICTO',
        'El bloque ya comenzó; selecciona otro horario.',
      );
    }
    if (await repositorio.existeCompromiso(solicitud)) {
      throw new ErrorSesion(
        'CONFLICTO',
        'El bloque o el horario de un participante ya está ocupado.',
      );
    }
  }

  async aceptarSesion(idSesion: string, idUsuario: string) {
    const id = interpretarIdentificador(idSesion, 'id_sesion');
    const usuario = interpretarIdentificador(idUsuario, 'id_usuario');
    return this.unidadDeTrabajo.ejecutar(async (contexto) => {
      const sesion = await this.buscarSesion(contexto, id);
      validarTutor(sesion, usuario);
      validarEstado(sesion, 'PENDIENTE');
      if (await contexto.sesiones.existeSolapamiento(sesion)) {
        throw new ErrorSesion(
          'CONFLICTO',
          'Otra solicitud o sesión ocupa ese horario.',
        );
      }
      return cambiarEstadoSesion(contexto, sesion, 'CONFIRMADA');
    });
  }

  async rechazarSesion(idSesion: string, idUsuario: string) {
    const id = interpretarIdentificador(idSesion, 'id_sesion');
    const usuario = interpretarIdentificador(idUsuario, 'id_usuario');
    const actualizada = await this.unidadDeTrabajo.ejecutar(
      async (contexto) => {
        const sesion = await this.buscarSesion(contexto, id);
        validarTutor(sesion, usuario);
        validarEstado(sesion, 'PENDIENTE');
        return cambiarEstadoSesion(contexto, sesion, 'RECHAZADA');
      },
    );
    await this.liberaciones.procesar(actualizada.id_sesion);
    return actualizada;
  }

  async cancelarSesion(idSesion: string, idUsuario: string) {
    const id = interpretarIdentificador(idSesion, 'id_sesion');
    const usuario = interpretarIdentificador(idUsuario, 'id_usuario');
    const actualizada = await this.unidadDeTrabajo.ejecutar(
      async (contexto) => {
        const sesion = await this.buscarSesion(contexto, id);
        validarParticipante(sesion, usuario);
        validarEstado(sesion, 'CONFIRMADA');
        if (await contexto.sesiones.haComenzado(sesion.inicio)) {
          throw new ErrorSesion(
            'CONFLICTO',
            'La sesión ya comenzó; no se puede cancelar.',
          );
        }
        return cambiarEstadoSesion(contexto, sesion, 'CANCELADA');
      },
    );
    await this.liberaciones.procesar(actualizada.id_sesion);
    return actualizada;
  }

  async declararCierre(
    idSesion: string,
    idUsuario: string,
    entrada: EntradaDeclararCierre,
  ) {
    const id = interpretarIdentificador(idSesion, 'id_sesion');
    const usuario = interpretarIdentificador(idUsuario, 'id_usuario');
    const inasistente = this.validarInasistencia(entrada);
    const resultado = await this.unidadDeTrabajo.ejecutar(async (contexto) => {
      const sesion = await this.buscarSesion(contexto, id);
      validarParticipante(sesion, usuario);
      validarEstado(sesion, 'PENDIENTE_CIERRE');
      if (
        inasistente !== null &&
        inasistente !== sesion.id_tutor &&
        inasistente !== sesion.id_tutee
      ) {
        throw new ErrorSesion(
          'ENTRADA_INVALIDA',
          'El usuario inasistente debe participar en la sesión.',
        );
      }
      const registrada = await contexto.declaraciones.registrarSiNoExiste({
        id_sesion: id,
        id_usuario: usuario,
        resultado_declarado: entrada.resultado_declarado,
        id_usuario_inasistente: inasistente,
      });
      if (!registrada)
        throw new ErrorSesion(
          'CONFLICTO',
          'Ya registraste una declaración para esta sesión.',
        );
      const declaraciones = await contexto.declaraciones.consultarPorSesion(id);
      const propia = declaraciones.find(
        (declaracion) => declaracion.id_usuario === usuario,
      )!;
      if (declaraciones.length === 1)
        return { sesion, declaracion: propia, idAviso: null };
      const coinciden =
        declaraciones[0].resultado_declarado ===
          declaraciones[1].resultado_declarado &&
        declaraciones[0].id_usuario_inasistente ===
          declaraciones[1].id_usuario_inasistente;
      const actualizada = await cambiarEstadoSesion(
        contexto,
        sesion,
        coinciden ? entrada.resultado_declarado : 'EN_CONFLICTO',
      );
      const idAviso = coinciden
        ? null
        : await contexto.avisosModeracion.registrarPendiente({
            tipo: 'CONFLICTO_DETECTADO',
            id_sesion: id.toString(),
            id_tutor: sesion.id_tutor.toString(),
            id_tutee: sesion.id_tutee.toString(),
            id_materia: sesion.id_materia.toString(),
            fecha_conflicto: actualizada.fecha_actualizacion.toISOString(),
            declaraciones: declaraciones.map((declaracion) => ({
              id_declaracion: declaracion.id_declaracion.toString(),
              id_usuario: declaracion.id_usuario.toString(),
              resultado_declarado: declaracion.resultado_declarado,
              id_usuario_inasistente:
                declaracion.id_usuario_inasistente?.toString() ?? null,
              fecha_declaracion: declaracion.fecha_declaracion.toISOString(),
            })),
          });
      return { sesion: actualizada, declaracion: propia, idAviso };
    });
    if (!ESTADOS_OCUPADOS.includes(resultado.sesion.estado_sesion)) {
      await this.liberaciones.procesar(resultado.sesion.id_sesion);
    }
    if (resultado.idAviso !== null)
      await this.avisosModeracion.procesar(resultado.idAviso);
    return { sesion: resultado.sesion, declaracion: resultado.declaracion };
  }

  consultarHistorial(idUsuario: string) {
    return this.sesiones.consultarHistorial(
      interpretarIdentificador(idUsuario, 'id_usuario'),
    );
  }

  async resolverConflicto(
    idSesion: string,
    entrada: EntradaResolverConflicto,
    idAdministrador: string,
  ) {
    const id = interpretarIdentificador(idSesion, 'id_sesion');
    const administrador = interpretarIdentificador(idAdministrador, 'id_admin');
    const resultado = await this.unidadDeTrabajo.ejecutar(async (contexto) => {
      const sesion = await this.buscarSesion(contexto, id);
      validarEstado(sesion, 'EN_CONFLICTO');
      const actualizada = await cambiarEstadoSesion(
        contexto,
        sesion,
        entrada.nuevo_estado,
      );
      const resolucion = await contexto.resoluciones.registrar({
        id_sesion: id,
        id_administrador: administrador,
        estado_final: entrada.nuevo_estado,
        motivo_resolucion: entrada.motivo_resolucion.trim(),
        observaciones: entrada.observaciones ?? null,
      });
      const idAviso = await contexto.avisosModeracion.registrarPendiente({
        tipo: 'CONFLICTO_RESUELTO',
        id_sesion: id.toString(),
        id_resolucion: resolucion.id_resolucion.toString(),
        id_administrador: resolucion.id_administrador.toString(),
        estado_final: resolucion.estado_final,
        motivo_resolucion: resolucion.motivo_resolucion,
        observaciones: resolucion.observaciones,
        fecha_resolucion: resolucion.fecha_resolucion.toISOString(),
      });
      return { sesion: actualizada, idAviso };
    });
    await this.liberaciones.procesar(resultado.sesion.id_sesion);
    await this.avisosModeracion.procesar(resultado.idAviso);
    return resultado.sesion;
  }

  async calificarSesion(
    idSesion: string,
    idUsuario: string,
    entrada: EntradaCalificarSesion,
  ) {
    const id = interpretarIdentificador(idSesion, 'id_sesion');
    const evaluador = interpretarIdentificador(idUsuario, 'id_usuario');
    const resultado = await this.unidadDeTrabajo.ejecutar(async (contexto) => {
      const sesion = await this.buscarSesion(contexto, id);
      validarParticipante(sesion, evaluador);
      validarEstado(sesion, 'COMPLETADA');
      const evaluado =
        evaluador === sesion.id_tutor ? sesion.id_tutee : sesion.id_tutor;
      if (evaluador === evaluado)
        throw new ErrorSesion(
          'ENTRADA_INVALIDA',
          'No puedes calificarte a ti mismo.',
        );
      const registrada = await contexto.calificaciones.registrarSiNoExiste({
        id_sesion: id,
        id_evaluador: evaluador,
        id_evaluado: evaluado,
        puntuacion: entrada.puntuacion,
      });
      if (!registrada)
        throw new ErrorSesion('CONFLICTO', 'Ya calificaste esta sesión.');
      const calificacion = await contexto.calificaciones.buscarPorEvaluador(
        id,
        evaluador,
      );
      const reputacionTutor = await calcularReputacionTutor(
        contexto.calificaciones,
        sesion.id_tutor,
      );
      const debeSincronizar = evaluado === sesion.id_tutor;
      if (debeSincronizar)
        await contexto.entregas.registrarPendiente(
          calificacion.id_calificacion,
        );
      return { calificacion, reputacionTutor, debeSincronizar };
    });
    if (resultado.debeSincronizar) {
      try {
        await this.reputacion.enviarCalificacion(
          resultado.calificacion.id_calificacion,
        );
      } catch {
        this.registro.error(
          'No se pudo iniciar la sincronización de reputación.',
        );
      }
    }
    return {
      calificacion: resultado.calificacion,
      reputacion_tutor: resultado.reputacionTutor,
    };
  }

  obtenerReputacionTutor(idTutor: string) {
    return calcularReputacionTutor(
      this.calificaciones,
      interpretarIdentificador(idTutor, 'id_tutor'),
    );
  }

  private async buscarSesion(contexto: ContextoTransaccion, id: bigint) {
    const sesion = await contexto.sesiones.buscarPorId(id);
    if (!sesion) throw new ErrorSesion('NO_ENCONTRADA', 'La sesión no existe.');
    return sesion;
  }

  private validarInasistencia(entrada: EntradaDeclararCierre): bigint | null {
    if (entrada.resultado_declarado === 'INASISTENCIA') {
      if (
        entrada.id_usuario_inasistente === undefined ||
        entrada.id_usuario_inasistente === null
      ) {
        throw new ErrorSesion(
          'ENTRADA_INVALIDA',
          'Debes indicar qué participante no asistió.',
        );
      }
      return interpretarIdentificador(
        entrada.id_usuario_inasistente,
        'id_usuario_inasistente',
      );
    }
    if (entrada.id_usuario_inasistente !== undefined)
      throw new ErrorSesion(
        'ENTRADA_INVALIDA',
        'Solo la inasistencia admite id_usuario_inasistente.',
      );
    return null;
  }
}

export async function cambiarEstadoSesion(
  contexto: ContextoTransaccion,
  sesion: Sesion,
  siguiente: EstadoSesion,
  provisional = false,
) {
  validarTransicion(sesion.estado_sesion, siguiente);
  const actualizada = await contexto.sesiones.cambiarEstado(
    sesion,
    siguiente,
    provisional,
  );
  if (!actualizada)
    throw new ErrorSesion(
      'CONFLICTO',
      'La sesión cambió de estado. Actualiza e intenta nuevamente.',
    );
  if (!ESTADOS_OCUPADOS.includes(siguiente)) {
    await contexto.liberaciones.registrarPendiente(
      sesion.id_sesion,
      sesion.id_bloque,
    );
  }
  return actualizada;
}

async function calcularReputacionTutor(
  repositorio: RepositorioCalificaciones,
  idTutor: bigint,
) {
  const resumen = await repositorio.resumirNotasComoTutor(idTutor);
  const promedio = resumen.promedio;
  return {
    id_tutor: idTutor,
    cantidad_calificaciones: resumen.cantidad,
    promedio,
    requiere_revision:
      resumen.cantidad >= 3 && promedio !== null && promedio < 2.5,
  };
}
