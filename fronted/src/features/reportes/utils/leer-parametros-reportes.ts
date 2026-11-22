import { ESTADOS_REPORTE, type EstadoReporte, type FiltrosReportes } from '../models/reporte'

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/

export function esFechaFiltro(valor: string): boolean {
  if (!FORMATO_FECHA.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00.000Z`)
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
}

export function leerFiltrosReportes(parametros: URLSearchParams): FiltrosReportes {
  const estado = (parametros.get('estado') ?? '').trim().toUpperCase()
  const fechaDesde = parametros.get('fecha_desde') ?? ''
  const fechaHasta = parametros.get('fecha_hasta') ?? ''
  const textoPagina = parametros.get('pagina') ?? '1'
  const pagina = /^[1-9]\d*$/.test(textoPagina) && Number.isSafeInteger(Number(textoPagina))
    ? Number(textoPagina)
    : 1
  return {
    ...(ESTADOS_REPORTE.some((valor) => valor === estado) ? { estado: estado as EstadoReporte } : {}),
    ...(fechaDesde && esFechaFiltro(fechaDesde) ? { fechaDesde } : {}),
    ...(fechaHasta && esFechaFiltro(fechaHasta) ? { fechaHasta } : {}),
    pagina,
  }
}

export function parametrosDeFiltros(filtros: FiltrosReportes): URLSearchParams {
  const parametros = new URLSearchParams()
  if (filtros.estado) parametros.set('estado', filtros.estado)
  if (filtros.fechaDesde) parametros.set('fecha_desde', filtros.fechaDesde)
  if (filtros.fechaHasta) parametros.set('fecha_hasta', filtros.fechaHasta)
  if (filtros.pagina > 1) parametros.set('pagina', String(filtros.pagina))
  return parametros
}
