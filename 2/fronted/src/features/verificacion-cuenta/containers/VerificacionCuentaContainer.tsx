import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ErrorVerificacion, type VerificacionCuentaPuerto } from '../aplicacion/verificacion-cuenta.puerto'
import { leerVistaVerificacion, type EstadoVerificacion } from '../models/estado-verificacion'
import VerificacionCuentaPage from '../pages/VerificacionCuentaPage'

export default function VerificacionCuentaContainer({ api }: { api: VerificacionCuentaPuerto }) {
  const [parametros] = useSearchParams()
  const tokens = parametros.getAll('token')
  const vista = parametros.get('vista')
  const demostracion = import.meta.env.DEV && !tokens.length && vista !== null
  return <Verificacion key={parametros.toString()} api={api} token={tokens[0] ?? null}
    inicial={demostracion ? leerVistaVerificacion(vista, true) : tokens.length > 1 || tokens[0] === '' ? 'invalida' : 'pendiente'}
    demostracion={demostracion} />
}

function Verificacion({ api, token, inicial, demostracion }: {
  api: VerificacionCuentaPuerto; token: string | null; inicial: EstadoVerificacion; demostracion: boolean
}) {
  const [estado, setEstado] = useState(inicial)
  const [reenvio, setReenvio] = useState<'inactivo' | 'enviando' | 'enviado' | 'error'>('inactivo')
  const peticion = useRef<AbortController | null>(null)
  useEffect(() => () => peticion.current?.abort(), [])

  async function ejecutar(accion: 'confirmar' | 'reenviar', valor: string) {
    if (demostracion || peticion.current) return
    const control = new AbortController()
    peticion.current = control
    if (accion === 'confirmar') setEstado('verificando')
    else setReenvio('enviando')
    try {
      await api[accion](valor, control.signal)
      if (control.signal.aborted) return
      if (accion === 'confirmar') setEstado('verificada')
      else { setReenvio('enviado'); setEstado('pendiente') }
    } catch (error) {
      if (control.signal.aborted) return
      if (accion === 'confirmar') setEstado(error instanceof ErrorVerificacion ? error.estado : 'error')
      else setReenvio('error')
    } finally {
      if (peticion.current === control) peticion.current = null
    }
  }

  return <VerificacionCuentaPage estado={estado} demostracion={demostracion} reenvio={reenvio}
    confirmar={token && inicial !== 'invalida' && reenvio !== 'enviado' && (estado === 'pendiente' || estado === 'error')
      ? () => { void ejecutar('confirmar', token) } : undefined}
    reenviar={(correo) => { void ejecutar('reenviar', correo) }} />
}
