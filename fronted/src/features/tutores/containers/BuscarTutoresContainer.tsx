import { useSearchParams } from 'react-router'
import { useMaterias } from '../../materias/hooks/useMaterias'
import { useBuscarTutores } from '../hooks/useBuscarTutores'
import type { CriteriosBusquedaTutores } from '../models/criterios-busqueda-tutores'
import BuscarTutoresPage from '../pages/BuscarTutoresPage'
import { leerParametrosBusqueda } from '../utils/leer-parametros-busqueda'

export default function BuscarTutoresContainer() {
  const [parametros, setParametros] = useSearchParams()
  const { materiaId, page, error: errorParametros } = leerParametrosBusqueda(parametros)
  const { consulta: catalogo, recargar: recargarMaterias } = useMaterias()
  const materias = catalogo.estado === 'listo' ? catalogo.materias : []
  const materia = materias.find((item) => item.idMateria === materiaId)
  const error = errorParametros ?? (catalogo.estado === 'listo' && materiaId && !materia
    ? 'La materia seleccionada no está disponible. Elige otra materia.' : undefined)
  const { consulta, recargar } = useBuscarTutores(materia && !error ? materiaId : '', page)

  function buscar(criterios: CriteriosBusquedaTutores) {
    if (criterios.materiaId === materiaId && page === 1 && !error) recargar()
    else setParametros({ materiaId: criterios.materiaId, page: '1' })
  }

  return (
    <BuscarTutoresPage
      materias={materias}
      materiaId={materia?.idMateria ?? ''}
      cargandoMaterias={catalogo.estado === 'cargando'}
      errorMaterias={catalogo.estado === 'error' ? catalogo.mensaje : undefined}
      onReintentarMaterias={recargarMaterias}
      consulta={error ? { estado: 'error', mensaje: error } : consulta}
      onBuscar={buscar}
      onReintentar={error ? undefined : recargar}
      onCambiarPagina={(pagina) => setParametros({ materiaId, page: String(pagina) })}
    />
  )
}
