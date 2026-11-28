import { obtenerUrlApi } from '../../../config/api'

interface Notificacion {
  id: number
  mensaje: string
  creadoEn: string
}

export interface PaginaNotificaciones {
  datos: Notificacion[]
  paginacion: { total_paginas: number }
}

function esNotificacion(valor: unknown): valor is Notificacion {
  if (!valor || typeof valor !== 'object') return false
  const datos = valor as Partial<Notificacion>
  return Number.isSafeInteger(datos.id)
    && typeof datos.mensaje === 'string'
    && datos.mensaje.trim().length > 0
    && typeof datos.creadoEn === 'string'
    && Number.isFinite(Date.parse(datos.creadoEn))
}

function esPagina(valor: unknown): valor is PaginaNotificaciones {
  if (!valor || typeof valor !== 'object') return false
  const pagina = valor as Partial<PaginaNotificaciones>
  const totalPaginas = pagina.paginacion?.total_paginas
  return Array.isArray(pagina.datos)
    && pagina.datos.every(esNotificacion)
    && typeof totalPaginas === 'number'
    && Number.isSafeInteger(totalPaginas)
    && totalPaginas >= 0
}

export async function consultarNotificaciones(token: string, pagina: number, signal: AbortSignal) {
  const url = new URL(obtenerUrlApi('reportes-moderacion/notificaciones'))
  url.searchParams.set('pagina', String(pagina))
  const respuesta = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  })

  if (respuesta.status === 401) return { estado: 'sesion' } as const
  if (!respuesta.ok) throw new Error('No pudimos cargar tus notificaciones.')

  const resultado: unknown = await respuesta.json()
  if (!esPagina(resultado)) throw new Error('La respuesta de notificaciones no es válida.')

  return { estado: 'lista', resultado } as const
}
