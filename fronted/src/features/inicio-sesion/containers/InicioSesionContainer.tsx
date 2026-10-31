import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { guardarSesionUsuario } from '../../../shared/auth/usuario-autenticado'
import { obtenerInicioPorRol } from '../../../shared/layout/configuracion-navegacion'
import { ErrorInicioSesion, type InicioSesionPuerto } from '../aplicacion/inicio-sesion.puerto'
import type { CredencialesInicioSesion } from '../models/credenciales'
import type { EstadoEnvioInicioSesion } from '../models/estado-inicio-sesion'
import InicioSesionPage from '../pages/InicioSesionPage'
import { leerDestinoSolicitado } from '../utils/destino-inicio-sesion'

export default function InicioSesionContainer({ api }: { api: InicioSesionPuerto }) {
  const sesion = useSesionUsuario()
  const { state } = useLocation()
  const [envio, setEnvio] = useState<EstadoEnvioInicioSesion>('inactivo')
  const peticion = useRef<AbortController | null>(null)
  useEffect(() => () => peticion.current?.abort(), [])

  async function iniciarSesion(credenciales: CredencialesInicioSesion) {
    if (peticion.current) return
    const control = new AbortController()
    peticion.current = control
    setEnvio('enviando')
    try {
      const resultado = await api.iniciarSesion(credenciales, control.signal)
      if (control.signal.aborted) return
      // Al guardar, useSesionUsuario recibe stp:sesion y esta vista redirige.
      guardarSesionUsuario(resultado)
      setEnvio('inactivo')
    } catch (error) {
      if (control.signal.aborted) return
      setEnvio(error instanceof ErrorInicioSesion ? error.estado : 'error')
    } finally {
      if (peticion.current === control) peticion.current = null
    }
  }

  if (sesion) return <Navigate to={leerDestinoSolicitado(state) ?? obtenerInicioPorRol(sesion.roles)} replace />
  return <InicioSesionPage envio={envio} iniciarSesion={(credenciales) => { void iniciarSesion(credenciales) }} />
}
