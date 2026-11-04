import { esIdentificador } from '../../../shared/utils/identificadores'
import { ESTADOS_SESION, type Sesion } from '../models/sesion'

function esFecha(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(valor)) return false
  const fecha = new Date(valor)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 19) === valor.slice(0, 19)
}

export function esSesion(valor: unknown): valor is Sesion {
  if (typeof valor !== 'object' || valor === null) return false
  const datos = valor as Record<string, unknown>
  return ['id_sesion', 'id_tutee', 'id_tutor', 'id_materia', 'id_bloque'].every((campo) => esIdentificador(datos[campo]))
    && typeof datos.estado_sesion === 'string' && ESTADOS_SESION.some((estado) => estado === datos.estado_sesion)
    && esFecha(datos.inicio) && esFecha(datos.fin) && Date.parse(datos.inicio) < Date.parse(datos.fin)
    && esFecha(datos.fecha_creacion) && esFecha(datos.fecha_actualizacion)
    && typeof datos.resultado_provisional === 'boolean'
}
