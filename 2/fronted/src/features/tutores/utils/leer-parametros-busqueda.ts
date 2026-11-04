import { esIdentificador } from '../../../shared/utils/identificadores'

export function leerParametrosBusqueda(parametros: URLSearchParams) {
  const materiaId = parametros.get('materiaId') ?? ''
  const textoPagina = parametros.get('page') ?? '1'
  const page = Number(textoPagina)
  const invalido = parametros.getAll('materiaId').length > 1 || parametros.getAll('page').length > 1
    || (parametros.has('materiaId') && !esIdentificador(materiaId))
    || !/^[1-9]\d*$/.test(textoPagina) || !Number.isSafeInteger(page)
    || !Number.isSafeInteger((page - 1) * 10)
    || (!materiaId && parametros.has('page'))

  return {
    materiaId, page,
    error: invalido ? 'La búsqueda no es válida. Selecciona una materia para empezar de nuevo.' : undefined,
  }
}
