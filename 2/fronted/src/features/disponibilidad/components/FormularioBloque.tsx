import { useId, useState, type FormEvent } from 'react'
import type { BloqueDisponibilidad, HorarioDisponibilidad } from '../models/bloque-disponibilidad'
import { validarHorario, type ErroresHorario } from '../utils/validar-horario'
import './FormularioBloque.css'

interface Propiedades {
  bloques: BloqueDisponibilidad[]
  bloqueEditado: BloqueDisponibilidad | null
  guardando: boolean
  onGuardar: (horario: HorarioDisponibilidad) => Promise<boolean>
  onCancelar: () => void
}

const HORARIO_INICIAL: HorarioDisponibilidad = {
  dia: '',
  horaInicio: '09:00',
  horaFin: '10:00',
}

export function FormularioBloque({
  bloques,
  bloqueEditado,
  guardando,
  onGuardar,
  onCancelar,
}: Propiedades) {
  const id = useId()

  const [horario, establecerHorario] = useState<HorarioDisponibilidad>(
    () =>
      bloqueEditado
        ? {
            dia: bloqueEditado.dia,
            horaInicio: bloqueEditado.horaInicio,
            horaFin: bloqueEditado.horaFin,
          }
        : HORARIO_INICIAL,
  )

  const [errores, establecerErrores] = useState<ErroresHorario>({})

  const bloqueado =
    guardando ||
    (bloqueEditado !== null &&
      bloqueEditado.estadoBloque !== 'DISPONIBLE')

  function cambiar(campo: keyof HorarioDisponibilidad, valor: string) {
    establecerHorario((actual) => ({
      ...actual,
      [campo]: valor,
    }))
    establecerErrores({})
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    if (bloqueado) return

    const nuevosErrores = validarHorario(
      horario,
      bloques,
      bloqueEditado?.idBloque ?? null,
    )

    establecerErrores(nuevosErrores)

    if (Object.keys(nuevosErrores).length > 0) return

    const guardado = await onGuardar(horario)

    if (guardado && !bloqueEditado) {
      establecerHorario({
        ...HORARIO_INICIAL,
        dia: horario.dia,
      })
    }
  }

  return (
    <aside
      className="formulario-bloque"
      aria-labelledby={`${id}-titulo`}
    >
      <div className="formulario-bloque__cabecera">
        <h2 id={`${id}-titulo`}>
          {bloqueEditado ? 'Editar bloque' : 'Nuevo bloque'}
        </h2>
        <p>Selecciona una fecha y un intervalo horario.</p>
      </div>

      <form
        className="formulario-bloque__campos"
        onSubmit={enviar}
        noValidate
        aria-busy={guardando}
      >
        <label className="formulario-bloque__campo">
          <span>Fecha</span>
          <input
            type="date"
            value={horario.dia}
            onChange={(evento) => cambiar('dia', evento.target.value)}
            disabled={bloqueado}
            aria-invalid={Boolean(errores.dia)}
            aria-describedby={errores.dia ? `${id}-fecha-error` : undefined}
            required
          />
        </label>

        {errores.dia && (
          <p className="formulario-bloque__error" id={`${id}-fecha-error`} role="alert">
            {errores.dia}
          </p>
        )}

        <div className="formulario-bloque__horas">
          <label className="formulario-bloque__campo">
            <span>Desde</span>
            <input
              type="time"
              step={60}
              value={horario.horaInicio}
              onChange={(evento) =>
                cambiar('horaInicio', evento.target.value)
              }
              disabled={bloqueado}
              aria-invalid={Boolean(errores.horaInicio)}
              aria-describedby={
                errores.horaInicio ? `${id}-inicio-error` : undefined
              }
              required
            />
          </label>

          <label className="formulario-bloque__campo">
            <span>Hasta</span>
            <input
              type="time"
              step={60}
              value={horario.horaFin}
              onChange={(evento) =>
                cambiar('horaFin', evento.target.value)
              }
              disabled={bloqueado}
              aria-invalid={Boolean(errores.horaFin)}
              aria-describedby={
                errores.horaFin ? `${id}-fin-error` : undefined
              }
              required
            />
          </label>
        </div>

        {errores.horaInicio && (
          <p className="formulario-bloque__error" id={`${id}-inicio-error`} role="alert">
            {errores.horaInicio}
          </p>
        )}

        {errores.horaFin && (
          <p className="formulario-bloque__error" id={`${id}-fin-error`} role="alert">
            {errores.horaFin}
          </p>
        )}

        {errores.formulario && (
          <p className="formulario-bloque__alerta" role="alert">
            {errores.formulario}
          </p>
        )}

        <button
          className="formulario-bloque__enviar"
          type="submit"
          disabled={bloqueado}
        >
          {guardando
            ? 'Guardando…'
            : bloqueEditado
              ? 'Guardar cambios'
              : 'Añadir bloque'}
        </button>

        {bloqueEditado && (
          <button
            className="formulario-bloque__cancelar"
            type="button"
            disabled={guardando}
            onClick={onCancelar}
          >
            Cancelar edición
          </button>
        )}
      </form>
    </aside>
  )
}
