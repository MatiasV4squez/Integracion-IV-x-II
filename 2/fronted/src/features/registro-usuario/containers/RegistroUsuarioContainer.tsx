import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ErrorRegistro, type RegistroUsuarioPuerto } from '../aplicacion/registro-usuario.puerto'
import type { DatosRegistroUsuario } from '../models/datos-registro'
import type { EstadoEnvioRegistro } from '../models/estado-registro'
import RegistroUsuarioPage from '../pages/RegistroUsuarioPage'

export default function RegistroUsuarioContainer({ api }: { api: RegistroUsuarioPuerto }) {
  const navegar = useNavigate()
  const [envio, setEnvio] = useState<EstadoEnvioRegistro>('inactivo')
  const peticion = useRef<AbortController | null>(null)
  useEffect(() => () => peticion.current?.abort(), [])

  async function registrar(datos: DatosRegistroUsuario) {
    if (peticion.current) return
    const control = new AbortController()
    peticion.current = control
    setEnvio('enviando')
    try {
      const resultado = await api.registrar(datos, control.signal)
      if (control.signal.aborted) return
      // Solo se conserva el correo y el resultado del envío; nunca la contraseña.
      void navegar('/verificar-cuenta', { replace: true, state: resultado })
    } catch (error) {
      if (control.signal.aborted) return
      setEnvio(error instanceof ErrorRegistro ? error.estado : 'error')
    } finally {
      if (peticion.current === control) peticion.current = null
    }
  }

  return <RegistroUsuarioPage envio={envio} registrar={(datos) => { void registrar(datos) }} />
}
