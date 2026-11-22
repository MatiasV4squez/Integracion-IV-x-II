import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useMaterias } from '../../materias/hooks/useMaterias'
import { useConsultaTutorias } from '../hooks/useConsultaTutorias'
import { useNombresParticipantes } from '../hooks/useNombresParticipantes'
import { consultarHistorialPaginado, idsParticipantes } from '../services/tutorias-api'
import { filtrosTutoriasDelUsuario, parametrosHistorialPanel, parametrosTutorias } from '../utils/filtros-tutorias'
import type { FiltrosTutorias } from '../models/tutoria'
import HistorialTutoriasPage from '../pages/HistorialTutoriasPage'

function TutoriasDelUsuario({ sesion }: { sesion: SesionUsuario }) {
  const [parametros, setParametros] = useSearchParams()
  const busqueda = parametros.toString()
  const filtros = useMemo(() => filtrosTutoriasDelUsuario(new URLSearchParams(busqueda), sesion.roles), [busqueda, sesion.roles])
  const consultar = useCallback((signal: AbortSignal) => consultarHistorialPaginado(sesion, filtros, signal), [sesion, filtros])
  const { consulta, recargar } = useConsultaTutorias(sesion.token + ':' + parametrosTutorias(filtros), consultar)
  const { consulta: catalogo } = useMaterias()
  const nombres = useNombresParticipantes(consulta.estado === 'listo' ? idsParticipantes(consulta.datos.items) : [], sesion.token)
  const filtrar = (cambios: Partial<FiltrosTutorias>) => setParametros(parametrosHistorialPanel({ ...filtros, ...cambios }))
  return <HistorialTutoriasPage idUsuario={sesion.idUsuario} roles={sesion.roles} consulta={consulta} filtros={filtros}
    materias={catalogo.estado === 'listo' ? catalogo.materias : []} nombres={nombres}
    busqueda={'?' + parametrosHistorialPanel(filtros)} onFiltrar={filtrar}
    onLimpiar={() => setParametros(parametrosHistorialPanel(filtrosTutoriasDelUsuario(new URLSearchParams(), sesion.roles)))} onRecargar={recargar} />
}

export default function HistorialTutoriasContainer() {
  const sesion = useSesionUsuario()
  return sesion ? <TutoriasDelUsuario key={sesion.idUsuario} sesion={sesion} /> : null
}
