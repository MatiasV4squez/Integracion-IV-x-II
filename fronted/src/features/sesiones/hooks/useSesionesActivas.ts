import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { consultarSesionesActivas } from '../services/sesiones-api'
import { useConsultaSesiones } from './useConsultaSesiones'

export function useSesionesActivas(sesion: SesionUsuario) {
  return useConsultaSesiones(sesion, consultarSesionesActivas)
}
