import { esIdentificador } from '../../../shared/utils/identificadores'
import type { ResultadoBusquedaTutores } from '../models/resultado-busqueda-tutores'
import type { HorarioDisponible, TutorBusqueda } from '../models/tutor-busqueda'

function esEnteroNoNegativo(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0
}

function esHorario(valor: unknown): valor is HorarioDisponible {
  if (typeof valor !== 'object' || valor === null) return false
  if (!('idBloque' in valor) || !esIdentificador(valor.idBloque)
    || !('dia' in valor) || typeof valor.dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor.dia)
    || !('horaInicio' in valor) || typeof valor.horaInicio !== 'string'
    || !('horaFin' in valor) || typeof valor.horaFin !== 'string') return false

  const fecha = new Date(valor.dia + 'T00:00:00Z')
  const horaValida = /^(?:[01]\d|2[0-3]):[0-5]\d$/
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor.dia
    && horaValida.test(valor.horaInicio) && horaValida.test(valor.horaFin)
    && valor.horaInicio < valor.horaFin
}

function esTutor(valor: unknown): valor is TutorBusqueda {
  if (typeof valor !== 'object' || valor === null) return false
  if (!('idTutor' in valor) || !esIdentificador(valor.idTutor)
    || !('cantidadCalificaciones' in valor) || !esEnteroNoNegativo(valor.cantidadCalificaciones)
    || !('promedioCalificaciones' in valor)
    || !('horariosDisponibles' in valor) || !Array.isArray(valor.horariosDisponibles)
    || !valor.horariosDisponibles.every(esHorario)) return false

  const promedioValido = valor.cantidadCalificaciones === 0
    ? valor.promedioCalificaciones === null
    : typeof valor.promedioCalificaciones === 'number' && Number.isFinite(valor.promedioCalificaciones)
      && valor.promedioCalificaciones >= 1 && valor.promedioCalificaciones <= 5
  return promedioValido
    && new Set(valor.horariosDisponibles.map((horario) => horario.idBloque)).size === valor.horariosDisponibles.length
}

export function esResultadoBusqueda(valor: unknown, page: number, limit: number): valor is ResultadoBusquedaTutores {
  if (typeof valor !== 'object' || valor === null) return false
  return 'items' in valor && Array.isArray(valor.items) && valor.items.every(esTutor)
    && 'total' in valor && esEnteroNoNegativo(valor.total)
    && 'page' in valor && valor.page === page
    && 'limit' in valor && valor.limit === limit
    && 'totalPages' in valor && valor.totalPages === Math.ceil(valor.total / limit)
    && valor.items.length <= limit
    && (page <= valor.totalPages || valor.items.length === 0)
    && valor.items.length <= valor.total
    && new Set(valor.items.map((tutor) => tutor.idTutor)).size === valor.items.length
}
