import { useEffect, useRef, useState } from 'react'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { actualizarNombreUsuario } from '../../../shared/auth/usuario-autenticado'
import { useMaterias } from '../../materias/hooks/useMaterias'
import type { CambiosPerfil, ConsultaPerfil, EstadoGuardadoPerfil } from '../models/perfil'
import PerfilPage from '../pages/PerfilPage'
import { actualizarPerfil, consultarPerfil, ErrorPerfil } from '../services/perfil-api'

const SIN_ASIGNATURAS: string[] = []

function PerfilDelUsuario({ sesion }: { sesion: SesionUsuario }) {
  const [consulta, setConsulta] = useState<ConsultaPerfil>({ estado: 'cargando' })
  const [intento, setIntento] = useState(0)
  const [editando, setEditando] = useState(false)
  const [guardado, setGuardado] = useState<EstadoGuardadoPerfil>({ estado: 'inactivo' })
  const { consulta: catalogo, revalidarSiFalta } = useMaterias()
  const envio = useRef<AbortController | null>(null)
  useEffect(() => () => envio.current?.abort(), [])

  useEffect(() => {
    const controlador = new AbortController()
    consultarPerfil(sesion, controlador.signal)
      .then((perfil) => { if (!controlador.signal.aborted) setConsulta({ estado: 'listo', perfil }) })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        setConsulta(error instanceof ErrorPerfil
          ? { estado: 'error', mensaje: error.message, tipo: error.tipo }
          : { estado: 'error', mensaje: 'No pudimos cargar tu perfil. Inténtalo de nuevo.', tipo: 'consulta' })
      })
    return () => controlador.abort()
  }, [sesion, intento])

  // Una asignatura guardada que no aparece en el catálogo puede ser nueva: se confirma antes de mostrarla como desconocida.
  const asignaturas = consulta.estado === 'listo' ? consulta.perfil.asignaturas_interes : SIN_ASIGNATURAS
  useEffect(() => { asignaturas.forEach(revalidarSiFalta) }, [asignaturas, revalidarSiFalta])

  async function guardar(cambios: CambiosPerfil) {
    if (envio.current) return
    const control = new AbortController()
    envio.current = control
    setGuardado({ estado: 'guardando' })
    try {
      const perfil = await actualizarPerfil(sesion, cambios, control.signal)
      if (control.signal.aborted) return
      setConsulta({ estado: 'listo', perfil })
      setEditando(false)
      setGuardado({ estado: 'exitoso' })
      // La cabecera muestra el nombre guardado al iniciar sesión; se mantiene sincronizado.
      if (cambios.nombre !== undefined) actualizarNombreUsuario(sesion.idUsuario, perfil.nombre)
    } catch (error) {
      if (control.signal.aborted) return
      setGuardado({ estado: 'error', mensaje: error instanceof Error ? error.message : 'No pudimos guardar tu perfil.' })
    } finally {
      if (envio.current === control) envio.current = null
    }
  }

  return (
    <PerfilPage
      consulta={consulta}
      materias={catalogo.estado === 'listo' ? catalogo.materias : []}
      cargandoMaterias={catalogo.estado === 'cargando'}
      editando={editando}
      guardado={guardado}
      onReintentar={() => { setConsulta({ estado: 'cargando' }); setIntento((actual) => actual + 1) }}
      onEditar={() => { setGuardado({ estado: 'inactivo' }); setEditando(true) }}
      onCancelar={() => { setGuardado({ estado: 'inactivo' }); setEditando(false) }}
      onGuardar={(cambios) => { void guardar(cambios) }}
    />
  )
}

export default function PerfilContainer() {
  const sesion = useSesionUsuario()
  // RutaProtegida exige la sesión; esto solo evita renderizar sin ella.
  if (!sesion) return null
  return <PerfilDelUsuario key={sesion.idUsuario} sesion={sesion} />
}
