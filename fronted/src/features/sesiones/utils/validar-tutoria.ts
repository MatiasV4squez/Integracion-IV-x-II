import { esIdentificador } from '../../../shared/utils/identificadores'
import { esFecha, esSesion } from './validar-sesion'
import type { CalificacionTutoria, DeclaracionTutoria, DetalleTutoria, Tutoria } from '../models/tutoria'
import type { Sesion } from '../models/sesion'

export function esPuntuacionTutoria(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 5
}

export function esCalificacion(valor: unknown, sesion: Sesion): valor is CalificacionTutoria {
  if (!valor || typeof valor !== 'object') return false
  const dato = valor as Record<string, unknown>
  const participantes = [sesion.id_tutee, sesion.id_tutor]
  return esIdentificador(dato.id_calificacion) && dato.id_sesion === sesion.id_sesion
    && participantes.includes(String(dato.id_evaluador)) && typeof dato.id_evaluador === 'string'
    && participantes.includes(String(dato.id_evaluado)) && typeof dato.id_evaluado === 'string'
    && dato.id_evaluador !== dato.id_evaluado && esPuntuacionTutoria(dato.puntuacion)
    && esFecha(dato.fecha_calificacion)
}

export function esTutoria(valor: unknown): valor is Tutoria {
  if (!esSesion(valor)) return false
  const datos = valor as Tutoria
  return Array.isArray(datos.calificaciones) && datos.calificaciones.length <= 2
    && datos.calificaciones.every((nota) => esCalificacion(nota, datos))
    && new Set(datos.calificaciones.map((nota) => nota.id_evaluador)).size === datos.calificaciones.length
}

export function esDeclaracion(valor: unknown, sesion: Sesion): valor is DeclaracionTutoria {
  if (!valor || typeof valor !== 'object') return false
  const dato = valor as Record<string, unknown>
  const participantes = [sesion.id_tutee, sesion.id_tutor]
  return esIdentificador(dato.id_declaracion) && dato.id_sesion === sesion.id_sesion
    && typeof dato.id_usuario === 'string' && participantes.includes(dato.id_usuario)
    && ['COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA'].includes(String(dato.resultado_declarado))
    && (dato.resultado_declarado === 'INASISTENCIA'
      ? typeof dato.id_usuario_inasistente === 'string' && participantes.includes(dato.id_usuario_inasistente)
      : dato.id_usuario_inasistente === null)
    && esFecha(dato.fecha_declaracion)
}

export function esDetalleTutoria(valor: unknown): valor is DetalleTutoria {
  if (!esTutoria(valor)) return false
  const datos = valor as DetalleTutoria
  const encuentro = datos.datos_encuentro
  const acciones = datos.acciones_disponibles
  return !!encuentro && typeof encuentro === 'object'
    && [null, 'PRESENCIAL', 'EN_LINEA'].includes(encuentro.modalidad)
    && (encuentro.lugar === null || typeof encuentro.lugar === 'string' && encuentro.lugar.length <= 255)
    && (encuentro.enlace === null || typeof encuentro.enlace === 'string' && encuentro.enlace.length <= 2048)
    && Array.isArray(datos.declaraciones) && datos.declaraciones.length <= 2
    && datos.declaraciones.every((declaracion) => esDeclaracion(declaracion, datos))
    && new Set(datos.declaraciones.map((declaracion) => declaracion.id_usuario)).size === datos.declaraciones.length
    && !!acciones && typeof acciones === 'object'
    && ['aceptar', 'rechazar', 'cancelar', 'declarar_cierre', 'calificar', 'resolver_conflicto']
      .every((accion) => typeof (acciones as unknown as Record<string, unknown>)[accion] === 'boolean')
}

export function copiarTutoria(datos: Tutoria): Tutoria {
  return {
    id_sesion: datos.id_sesion, id_tutee: datos.id_tutee, id_tutor: datos.id_tutor,
    id_materia: datos.id_materia, id_bloque: datos.id_bloque, estado_sesion: datos.estado_sesion,
    inicio: datos.inicio, fin: datos.fin, fecha_creacion: datos.fecha_creacion,
    fecha_actualizacion: datos.fecha_actualizacion, resultado_provisional: datos.resultado_provisional,
    calificaciones: datos.calificaciones.map((nota) => ({
      id_calificacion: nota.id_calificacion, id_sesion: nota.id_sesion, id_evaluador: nota.id_evaluador,
      id_evaluado: nota.id_evaluado, puntuacion: nota.puntuacion, fecha_calificacion: nota.fecha_calificacion,
    })),
  }
}
