import { ESTADOS_SESION, type Sesion } from '../models/sesion'
import type { FiltrosTutorias } from '../models/tutoria'

export const ETIQUETAS_SESION: Record<Sesion['estado_sesion'], string> = {
  PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', RECHAZADA: 'Rechazada',
  EXPIRADA: 'Expirada', CANCELADA: 'Cancelada', PENDIENTE_CIERRE: 'Por cerrar',
  COMPLETADA: 'Completada', NO_REALIZADA: 'No realizada', INASISTENCIA: 'Inasistencia', EN_CONFLICTO: 'En conflicto',
}

export function leerFiltrosTutorias(parametros: URLSearchParams): FiltrosTutorias {
  const pagina = parametros.get('page') ?? '1'
  const limite = Number(parametros.get('limit') ?? 10)
  const rol = parametros.get('rol')
  const estado = parametros.get('estado')
  return {
    page: /^[1-9]\d{0,6}$/.test(pagina) && Number(pagina) <= 1000000 ? Number(pagina) : 1,
    limit: [10, 20, 50].includes(limite) ? limite : 10,
    rol: rol === 'TUTOR' || rol === 'ESTUDIANTE' ? rol : '',
    estado: ESTADOS_SESION.find((valor) => valor === estado) ?? '',
  }
}

export function parametrosTutorias(filtros: FiltrosTutorias): URLSearchParams {
  const parametros = new URLSearchParams({ page: String(filtros.page), limit: String(filtros.limit) })
  if (filtros.rol) parametros.set('rol', filtros.rol)
  if (filtros.estado) parametros.set('estado', filtros.estado)
  return parametros
}

export function rolesTutoriasDisponibles(roles: readonly string[]): Array<'ESTUDIANTE' | 'TUTOR'> {
  return (['ESTUDIANTE', 'TUTOR'] as const).filter((rol) => roles.includes(rol))
}

export function filtrosTutoriasDelUsuario(parametros: URLSearchParams, roles: readonly string[]): FiltrosTutorias {
  const filtros = leerFiltrosTutorias(parametros)
  const disponibles = rolesTutoriasDisponibles(roles)
  if (disponibles.length !== 1) return filtros
  return {
    ...filtros,
    rol: disponibles[0],
    page: filtros.rol && filtros.rol !== disponibles[0] ? 1 : filtros.page,
  }
}

export function parametrosHistorialPanel(filtros: FiltrosTutorias): URLSearchParams {
  const parametros = parametrosTutorias(filtros)
  parametros.set('vista', 'historial')
  return parametros
}

export function vistaPanel(parametros: URLSearchParams, roles: readonly string[]): 'activas' | 'historial' {
  return !roles.includes('ESTUDIANTE') || parametros.get('vista') === 'historial' ? 'historial' : 'activas'
}

export function regresoPanel(parametros: URLSearchParams, roles: readonly string[]): string {
  const desde = parametros.get('desde')
  if (desde && desde.startsWith('/') && !desde.startsWith('//')) return desde
  if (!roles.includes('ESTUDIANTE') && !roles.includes('TUTOR')) return '/administracion/reportes'
  return parametros.get('vista') === 'activas' && roles.includes('ESTUDIANTE') ? '/panel'
    : '/panel?' + parametrosHistorialPanel(filtrosTutoriasDelUsuario(parametros, roles))
}

export function destinoTutoriasAnterior(idSesion: string | undefined, busqueda: string, hash: string) {
  const parametros = new URLSearchParams(busqueda)
  parametros.set('vista', 'historial')
  return {
    pathname: idSesion ? '/panel/tutorias/' + encodeURIComponent(idSesion) : '/panel',
    search: '?' + parametros, hash,
  }
}

export function enlaceEncuentroSeguro(enlace: string | null): string | undefined {
  if (!enlace) return undefined
  try {
    const url = new URL(enlace)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}
