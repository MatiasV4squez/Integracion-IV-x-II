import { esIdentificador } from '../../../shared/utils/identificadores'
import { ESTADOS_POSTULACION, type Postulacion } from '../models/postulacion'

export function esNotaAcreditada(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 5 && valor <= 7
    && Number.isInteger(valor * 10)
}

export function esMotivoRechazo(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length >= 3 && valor.trim().length <= 500
}

function esFecha(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(valor)) return false
  const fecha = new Date(valor)
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 19) === valor.slice(0, 19)
}

export function esPostulacion(valor: unknown): valor is Postulacion {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false
  const datos = valor as Record<string, unknown>
  return ['idPostulacion', 'idUsuario', 'idMateria'].every((campo) => esIdentificador(datos[campo]))
    && (datos.idAdministradorRevision === null || esIdentificador(datos.idAdministradorRevision))
    && typeof datos.certificadoNombre === 'string' && datos.certificadoNombre.trim().length > 0 && datos.certificadoNombre.length <= 255
    && ['application/pdf', 'image/png'].includes(datos.certificadoTipo as string)
    && (datos.notaAcreditada === null || esNotaAcreditada(datos.notaAcreditada))
    && ESTADOS_POSTULACION.some((estado) => estado === datos.estado)
    && esFecha(datos.fechaPostulacion)
    && (datos.fechaRevision === null || esFecha(datos.fechaRevision))
    && (datos.motivoRechazo === null || esMotivoRechazo(datos.motivoRechazo))
}
