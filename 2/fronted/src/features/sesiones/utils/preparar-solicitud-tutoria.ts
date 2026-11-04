import { esIdentificador } from '../../../shared/utils/identificadores'
import type { SeleccionTutoria } from '../models/solicitud-tutoria'

function limpiarIdentificador(valor: unknown, campo: string): string {
  if (typeof valor !== 'string') {
    throw new Error(`${campo} debe ser un identificador válido.`)
  }

  const identificador = valor.trim()

  if (!esIdentificador(identificador)) {
    throw new Error(`${campo} debe ser un identificador válido.`)
  }

  return identificador
}

export function prepararSolicitudTutoria(
  seleccion: SeleccionTutoria,
): SeleccionTutoria {
  return {
    id_tutor: limpiarIdentificador(seleccion.id_tutor, 'El tutor'),
    id_materia: limpiarIdentificador(seleccion.id_materia, 'La materia'),
    id_bloque: limpiarIdentificador(seleccion.id_bloque, 'El bloque horario'),
  }
}