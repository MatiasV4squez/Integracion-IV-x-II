import type { Sesion } from '../models/sesion'

export function seleccionarSolicitudesRecibidas(sesiones: Sesion[], idTutor: string): Sesion[] {
  return sesiones.filter((sesion) => sesion.id_tutor === idTutor && sesion.estado_sesion === 'PENDIENTE')
    .sort((a, b) => Date.parse(a.fecha_creacion) - Date.parse(b.fecha_creacion)
      || (BigInt(a.id_sesion) < BigInt(b.id_sesion) ? -1 : BigInt(a.id_sesion) > BigInt(b.id_sesion) ? 1 : 0))
}

export function obtenerPlazoSolicitud(fechaCreacion: string, ahora: number): string {
  const restante = Date.parse(fechaCreacion) + 24 * 60 * 60 * 1000 - ahora
  // La expiración efectiva la decide el microservicio en su siguiente ejecución programada.
  if (restante <= 0) return 'Plazo cumplido · pendiente de actualización'
  const minutos = Math.ceil(restante / 60000)
  return 'Expira en ' + Math.floor(minutos / 60) + ' h ' + String(minutos % 60).padStart(2, '0') + ' min'
}

const fechaSantiago = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Santiago' })
const horaSantiago = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Santiago' })

export function formatearHorarioSesion(inicio: string, fin: string): string {
  const desde = new Date(inicio)
  const hasta = new Date(fin)
  const fechaFin = fechaSantiago.format(hasta)
  const otroDia = fechaSantiago.format(desde) !== fechaFin ? fechaFin + ' · ' : ''
  return fechaSantiago.format(desde) + ' · ' + horaSantiago.format(desde) + '–' + otroDia + horaSantiago.format(hasta)
}
