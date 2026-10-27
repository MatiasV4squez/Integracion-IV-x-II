import { useId, useState, type FormEvent } from 'react'
import { Icon } from '../../../components/Icon'
import type { BloqueDisponibilidad, HorarioDisponibilidad } from '../models/bloque-disponibilidad'
import { validarHorario, type ErroresHorario } from '../utils/validar-horario'

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
      className="panel form-panel"
      id="block-form"
      aria-labelledby={`${id}-titulo`}
    >
      <div className="form-heading">
        <span className="form-heading__icon">
          <Icon name={bloqueEditado ? 'pencil' : 'plus'} />
        </span>

        <div>
          <h2 id={`${id}-titulo`}>
            {bloqueEditado ? 'Editar bloque' : 'Nuevo bloque'}
          </h2>
          <p>Selecciona una fecha y un intervalo horario.</p>
        </div>
      </div>

      <form
        className="availability-form"
        onSubmit={enviar}
        noValidate
        aria-busy={guardando}
      >
        <label className="field">
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
          <p className="field-error" id={`${id}-fecha-error`} role="alert">
            {errores.dia}
          </p>
        )}

        <div className="time-fields">
          <label className="field">
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

          <span className="time-arrow" aria-hidden="true">
            <Icon name="arrow-right" />
          </span>

          <label className="field">
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
          <p className="field-error" id={`${id}-inicio-error`} role="alert">
            {errores.horaInicio}
          </p>
        )}

        {errores.horaFin && (
          <p className="field-error" id={`${id}-fin-error`} role="alert">
            {errores.horaFin}
          </p>
        )}

        {errores.formulario && (
          <p className="form-alert" role="alert">
            {errores.formulario}
          </p>
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={bloqueado}
        >
          <Icon name={bloqueEditado ? 'check' : 'plus'} />
          {guardando
            ? 'Guardando…'
            : bloqueEditado
              ? 'Guardar cambios'
              : 'Añadir bloque'}
        </button>

        {bloqueEditado && (
          <button
            className="ghost-button"
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