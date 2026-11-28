import { useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useMaterias } from '../../materias/hooks/useMaterias'
import { useConsultaTutorias } from '../hooks/useConsultaTutorias'
import { useCalificarTutoria } from '../hooks/useCalificarTutoria'
import { useDeclararCierre } from '../hooks/useDeclararCierre'
import { useCancelarSesion } from '../hooks/useCancelarSesion'
import { useNombresParticipantes } from '../hooks/useNombresParticipantes'
import { useResolverConflicto } from '../hooks/useResolverConflicto'
import { consultarDetalleTutoria, idsParticipantes } from '../services/tutorias-api'
import { regresoPanel } from '../utils/filtros-tutorias'
import DetalleTutoriaPage from '../pages/DetalleTutoriaPage'

function DetalleDelUsuario({ sesion, idSesion }: { sesion: SesionUsuario; idSesion: string }) {
  const [parametros] = useSearchParams()
  const consultar = useCallback((signal: AbortSignal) => consultarDetalleTutoria(sesion, idSesion, signal), [sesion, idSesion])
  const { consulta, recargar } = useConsultaTutorias(sesion.token + ':' + idSesion, consultar)
  const cancelacion = useCancelarSesion(sesion, consulta, recargar)
  const cierre = useDeclararCierre(sesion, idSesion, recargar)
  const resolucion = useResolverConflicto(sesion, idSesion, recargar)
  const calificacion = useCalificarTutoria(sesion, consulta.estado === 'listo' ? consulta.datos : null, recargar)
  const { consulta: catalogo } = useMaterias()
  const nombres = useNombresParticipantes(consulta.estado === 'listo' ? idsParticipantes([consulta.datos]) : [], sesion.token)
  const materia = consulta.estado === 'listo' && catalogo.estado === 'listo'
    ? catalogo.materias.find((item) => item.idMateria === consulta.datos.id_materia)?.nombre : undefined
  const volver = regresoPanel(parametros, sesion.roles)

  function actualizar() {
    if (!cancelacion.puedeActualizar || cierre.enviando || resolucion.resolviendo || calificacion.enviando) return
    calificacion.limpiarError()
    cierre.actualizar()
    resolucion.actualizar()
  }

  return <DetalleTutoriaPage consulta={consulta} idUsuario={sesion.idUsuario} materia={materia} nombres={nombres}
    volver={volver} etiquetaVolver={volver.startsWith('/administracion') ? '← Volver a Reportes y moderación' : undefined}
    onRecargar={actualizar} cierre={cierre} resolucion={resolucion} cancelacion={cancelacion} calificacion={calificacion} />
}

export default function DetalleTutoriaContainer() {
  const sesion = useSesionUsuario()
  const { idSesion = '' } = useParams()
  return sesion ? <DetalleDelUsuario key={sesion.token + ':' + idSesion} sesion={sesion} idSesion={idSesion} /> : null
}
