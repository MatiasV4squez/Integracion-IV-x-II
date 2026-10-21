import type { Materia } from '../models/materia'

function normalizarTexto(texto: string): string {
  return texto.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function filtrarMaterias(materias: Materia[], consulta: string): Materia[] {
  const consultaNormalizada = normalizarTexto(consulta)

  if (!consultaNormalizada) {
    return materias
  }

  return materias.filter((materia) =>
    normalizarTexto(materia.nombre).includes(consultaNormalizada)
    || normalizarTexto(materia.codigo).includes(consultaNormalizada),
  )
}
