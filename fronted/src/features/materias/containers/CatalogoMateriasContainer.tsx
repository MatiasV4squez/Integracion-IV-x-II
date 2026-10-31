import { useMaterias } from '../hooks/useMaterias'
import CatalogoMateriasPage from '../pages/CatalogoMateriasPage'

export default function CatalogoMateriasContainer() {
  const { consulta, recargar, actualizando, errorActualizacion } = useMaterias()

  return (
    <CatalogoMateriasPage
      materias={consulta.estado === 'listo' ? consulta.materias : []}
      cargando={consulta.estado === 'cargando'}
      error={consulta.estado === 'error' ? consulta.mensaje : undefined}
      onReintentar={recargar}
      actualizando={actualizando}
      errorActualizacion={errorActualizacion}
      onActualizar={recargar}
      obtenerDestinoMateria={(materia) => '/tutores?' + new URLSearchParams({ materiaId: materia.idMateria, page: '1' })}
    />
  )
}
