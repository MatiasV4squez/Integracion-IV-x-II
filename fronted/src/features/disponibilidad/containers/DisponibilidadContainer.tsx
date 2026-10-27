import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useDisponibilidad } from '../hooks/useDisponibilidad'
import type { BloqueDisponibilidad, HorarioDisponibilidad } from '../models/bloque-disponibilidad'
import DisponibilidadPage from '../pages/DisponibilidadPage'

function DisponibilidadDelTutor({
  sesion,
}: {
  sesion: SesionUsuario
}) {
  const {
    consulta,
    recargar,
    guardando,
    errorOperacion,
    crear,
    actualizar,
    eliminar,
  } = useDisponibilidad(sesion)

  const [idEdicion, establecerIdEdicion] =
    useState<string | null>(null)

  const [mensaje, establecerMensaje] =
    useState<string | null>(null)

  const bloques =
    consulta.estado === 'listo' ? consulta.bloques : []

  const bloqueEditado =
    bloques.find((bloque) => bloque.idBloque === idEdicion) ?? null

  function editar(bloque: BloqueDisponibilidad) {
    if (guardando || bloque.estadoBloque !== 'DISPONIBLE') return

    establecerIdEdicion(bloque.idBloque)
    establecerMensaje(null)
  }

  function actualizarListado() {
    if (guardando) return

    establecerIdEdicion(null)
    establecerMensaje(null)
    recargar()
  }

  async function guardar(
    horario: HorarioDisponibilidad,
  ): Promise<boolean> {
    if (guardando || consulta.estado !== 'listo') return false

    if (idEdicion !== null && !bloqueEditado) {
      establecerIdEdicion(null)
      establecerMensaje(
        'El bloque ya no figura en tu disponibilidad. Revisa el listado.',
      )
      return false
    }

    establecerMensaje(null)

    const guardado =
      idEdicion !== null
        ? await actualizar(idEdicion, horario)
        : await crear(horario)

    if (guardado) {
      establecerIdEdicion(null)
      establecerMensaje(
        idEdicion !== null
          ? 'Cambios guardados correctamente.'
          : 'Bloque creado correctamente.',
      )
    }

    return guardado
  }

  async function eliminarBloque(
    idBloque: string,
  ): Promise<boolean> {
    if (guardando || consulta.estado !== 'listo') return false

    establecerMensaje(null)

    const eliminado = await eliminar(idBloque)

    if (eliminado) {
      establecerIdEdicion((actual) =>
        actual === idBloque ? null : actual,
      )
      establecerMensaje('Bloque eliminado correctamente.')
    }

    return eliminado
  }

  return (
    <DisponibilidadPage
      consulta={consulta}
      bloqueEditado={bloqueEditado}
      guardando={guardando}
      errorOperacion={errorOperacion}
      mensaje={mensaje}
      onRecargar={actualizarListado}
      onEditar={editar}
      onGuardar={guardar}
      onEliminar={eliminarBloque}
      onCancelar={() => establecerIdEdicion(null)}
    />
  )
}

export default function DisponibilidadContainer() {
  const sesion = useSesionUsuario()

  if (!sesion) {
    return <Navigate to="/login" replace />
  }

  if (!sesion.roles.includes('TUTOR')) {
    return (
      <main className="page">
        <h1>Gestión de disponibilidad</h1>
        <p role="alert">
          Esta sección está disponible para tutores.
        </p>
        <Link to="/materias">Ir a materias</Link>
      </main>
    )
  }

  return (
    <DisponibilidadDelTutor
      key={sesion.token}
      sesion={sesion}
    />
  )
}