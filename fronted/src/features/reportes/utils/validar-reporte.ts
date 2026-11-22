import { esIdentificador } from '../../../shared/utils/identificadores'
import {
  ESTADOS_REPORTE,
  RESULTADOS_CIERRE,
  type ConflictoSesionPendiente,
  type DeclaracionCierreConflicto,
  type ResultadoCierre,
  type Reporte,
} from '../models/reporte'

export const MAX_MOTIVO_RESOLUCION = 500

export interface ConflictoSesionCrudo {
  id_aviso: string
  fecha_aviso: string
  id_sesion: string
  contenido: {
    tipo: 'CONFLICTO_DETECTADO'
    id_sesion: string
    id_tutor: string
    id_tutee: string
    id_materia: string
    fecha_conflicto: string
    declaraciones: Array<{
      id_declaracion: string
      id_usuario: string
      resultado_declarado: ResultadoCierre
      id_usuario_inasistente: string | null
      fecha_declaracion: string
    }>
  }
}

export interface ResultadoConsultaCrudo {
  datos: Reporte[]
  paginacion: { pagina: number; limite: number; total: number; total_paginas: number }
  conflictos_sesion: ConflictoSesionCrudo[]
}

export function esFechaIso(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(valor)) return false
  const fecha = new Date(valor)
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 19) === valor.slice(0, 19)
}

export function esMotivoResolucion(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= MAX_MOTIVO_RESOLUCION
}

function esTexto(valor: unknown, maximo: number): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0 && valor.length <= maximo
}

function esIdentificadorONulo(valor: unknown): valor is string | null {
  return valor === null || esIdentificador(valor)
}

function esFechaONula(valor: unknown): valor is string | null {
  return valor === null || esFechaIso(valor)
}

function esEntero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor)
}

export function esReporte(valor: unknown): valor is Reporte {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false
  const datos = valor as Record<string, unknown>
  if (!esEntero(datos.id) || datos.id <= 0) return false
  if (!esTexto(datos.titulo, 10000) || !esTexto(datos.descripcion, 10000)) return false
  if (!ESTADOS_REPORTE.some((estado) => estado === datos.estado)) return false
  if (!esIdentificador(datos.idSesion) || !esIdentificador(datos.usuarioReportadorId)
    || !esIdentificador(datos.usuarioReportadoId)) return false
  if (!(datos.motivo === null || esMotivoResolucion(datos.motivo))) return false
  if (!esIdentificadorONulo(datos.resueltoPorId) || !esFechaONula(datos.resueltoEn)) return false
  if (!esIdentificadorONulo(datos.reactivadoPorId) || !esFechaONula(datos.reactivadoEn)) return false
  if (!esFechaIso(datos.creadoEn)) return false
  if (datos.estado === 'PENDIENTE') {
    return datos.motivo === null && datos.resueltoPorId === null && datos.resueltoEn === null
      && datos.reactivadoPorId === null && datos.reactivadoEn === null
  }
  if (datos.resueltoPorId === null || datos.resueltoEn === null) return false
  if (datos.estado !== 'SUSPENDIDO' && (datos.reactivadoPorId !== null || datos.reactivadoEn !== null)) return false
  return (datos.reactivadoPorId === null) === (datos.reactivadoEn === null)
}

function esDeclaracionCruda(valor: unknown): boolean {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false
  const datos = valor as Record<string, unknown>
  return esTexto(datos.id_declaracion, 200)
    && esIdentificador(datos.id_usuario)
    && RESULTADOS_CIERRE.some((resultado) => resultado === datos.resultado_declarado)
    && (datos.id_usuario_inasistente === null || esIdentificador(datos.id_usuario_inasistente))
    && esFechaIso(datos.fecha_declaracion)
}

export function esConflictoSesion(valor: unknown): valor is ConflictoSesionCrudo {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false
  const datos = valor as Record<string, unknown>
  if (!esTexto(datos.id_aviso, 200) || !esFechaIso(datos.fecha_aviso) || !esIdentificador(datos.id_sesion)) return false
  if (!datos.contenido || typeof datos.contenido !== 'object' || Array.isArray(datos.contenido)) return false
  const contenido = datos.contenido as Record<string, unknown>
  if (contenido.tipo !== 'CONFLICTO_DETECTADO') return false
  if (!esIdentificador(contenido.id_sesion) || !esIdentificador(contenido.id_tutor)
    || !esIdentificador(contenido.id_tutee) || !esIdentificador(contenido.id_materia)) return false
  if (!esFechaIso(contenido.fecha_conflicto)) return false
  if (!Array.isArray(contenido.declaraciones) || contenido.declaraciones.length === 0) return false
  if (!contenido.declaraciones.every(esDeclaracionCruda)) return false
  const ids = contenido.declaraciones.map((declaracion) => (declaracion as { id_declaracion: string }).id_declaracion)
  return new Set(ids).size === ids.length
}

export function esResultadoConsultaReportes(valor: unknown): valor is ResultadoConsultaCrudo {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false
  const datos = valor as Record<string, unknown>
  if (!Array.isArray(datos.datos) || !datos.datos.every(esReporte)) return false
  if (new Set(datos.datos.map((reporte) => reporte.id)).size !== datos.datos.length) return false
  if (!datos.paginacion || typeof datos.paginacion !== 'object' || Array.isArray(datos.paginacion)) return false
  const paginacion = datos.paginacion as Record<string, unknown>
  if (!esEntero(paginacion.pagina) || paginacion.pagina < 1) return false
  if (!esEntero(paginacion.limite) || paginacion.limite < 1 || paginacion.limite > 100) return false
  if (!esEntero(paginacion.total) || paginacion.total < 0) return false
  if (!esEntero(paginacion.total_paginas) || paginacion.total_paginas < 0) return false
  if (paginacion.total_paginas !== Math.ceil(paginacion.total / paginacion.limite)) return false
  if (!Array.isArray(datos.conflictos_sesion) || !datos.conflictos_sesion.every(esConflictoSesion)) return false
  const avisos = datos.conflictos_sesion.map((conflicto) => conflicto.id_aviso)
  return new Set(avisos).size === avisos.length
}

export function reconstruirReporte(datos: Reporte): Reporte {
  return {
    id: datos.id, titulo: datos.titulo, descripcion: datos.descripcion, estado: datos.estado,
    idSesion: datos.idSesion, usuarioReportadorId: datos.usuarioReportadorId,
    usuarioReportadoId: datos.usuarioReportadoId, motivo: datos.motivo,
    resueltoPorId: datos.resueltoPorId, resueltoEn: datos.resueltoEn,
    reactivadoPorId: datos.reactivadoPorId, reactivadoEn: datos.reactivadoEn, creadoEn: datos.creadoEn,
  }
}

export function reconstruirConflicto(crudo: ConflictoSesionCrudo): ConflictoSesionPendiente {
  return {
    idAviso: crudo.id_aviso,
    fechaAviso: crudo.fecha_aviso,
    idSesion: crudo.id_sesion,
    idTutor: crudo.contenido.id_tutor,
    idTutee: crudo.contenido.id_tutee,
    idMateria: crudo.contenido.id_materia,
    fechaConflicto: crudo.contenido.fecha_conflicto,
    declaraciones: crudo.contenido.declaraciones.map((declaracion): DeclaracionCierreConflicto => ({
      idDeclaracion: declaracion.id_declaracion,
      idUsuario: declaracion.id_usuario,
      resultadoDeclarado: declaracion.resultado_declarado,
      idUsuarioInasistente: declaracion.id_usuario_inasistente,
      fechaDeclaracion: declaracion.fecha_declaracion,
    })),
  }
}
