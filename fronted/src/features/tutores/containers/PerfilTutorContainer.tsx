import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { useMaterias } from '../../materias/hooks/useMaterias'
import { usePerfilTutor } from '../hooks/usePerfilTutor'
import PerfilTutorPage from '../pages/PerfilTutorPage'

export default function PerfilTutorContainer() {
  const { idTutor = '' } = useParams()
  const [parametros] = useSearchParams()
  const materiaId = parametros.get('materiaId') ?? ''
  const sesion = useSesionUsuario()
  const { consulta: catalogo, revalidarSiFalta } = useMaterias()
  useEffect(() => { if (materiaId) revalidarSiFalta(materiaId) }, [materiaId, revalidarSiFalta])
  const materia = catalogo.estado === 'listo'
    ? catalogo.materias.find((item) => item.idMateria === materiaId) : undefined
  const { consulta, recargar } = usePerfilTutor(idTutor, materiaId, sesion?.token)
  const esPropioPerfil = sesion?.idUsuario === idTutor

  return (
    <PerfilTutorPage
      consulta={consulta}
      materia={materia}
      destinoVolver={materiaId ? '/tutores?' + new URLSearchParams({ materiaId }) : '/tutores'}
      destinoSolicitud={esPropioPerfil ? undefined
        : '/solicitudes/nueva?' + new URLSearchParams({ materiaId, tutorId: idTutor })}
      onReintentar={recargar}
    />
  )
}
