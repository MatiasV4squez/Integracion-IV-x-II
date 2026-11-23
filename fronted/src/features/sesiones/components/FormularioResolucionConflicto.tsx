import type { FormEvent } from 'react'
import { RESULTADOS_CIERRE, type ResultadoCierre } from '../models/tutoria'
import { ETIQUETAS_SESION } from '../utils/filtros-tutorias'
import {
  MAX_MOTIVO_RESOLUCION,
  MAX_OBSERVACIONES_RESOLUCION,
  type EntradaResolucionConflicto,
} from '../services/resolver-conflicto-api'

export interface BorradorResolucion {
  estado: ResultadoCierre | ''
  motivo: string
  observaciones: string
}

interface Propiedades {
  borrador: BorradorResolucion
  onCambiar: (borrador: BorradorResolucion) => void
  resolviendo: boolean
  bloqueado: boolean
  onEnviar: (entrada: EntradaResolucionConflicto) => void
}

export function FormularioResolucionConflicto({ borrador, onCambiar, resolviendo, bloqueado, onEnviar }: Propiedades) {
  const { estado, motivo, observaciones } = borrador

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!estado || !motivo.trim() || resolviendo || bloqueado) return
    onEnviar({
      nuevo_estado: estado,
      motivo_resolucion: motivo.trim(),
      ...(observaciones.trim() !== '' ? { observaciones: observaciones.trim() } : {}),
    })
  }

  return (
    <form className="tutorias__formulario-resolucion" onSubmit={enviar} aria-label="Resolver conflicto" aria-busy={resolviendo}>
      <p className="tutorias__texto-secundario">Define el resultado final de la sesión. La decisión quedará registrada y se notificará a moderación.</p>
      <label>
        Estado final de la sesión
        <select
          required
          value={estado}
          disabled={resolviendo || bloqueado}
          onChange={(evento) => onCambiar({ ...borrador, estado: evento.target.value as ResultadoCierre | '' })}
        >
          <option value="">Selecciona un estado</option>
          {RESULTADOS_CIERRE.map((opcion) => <option key={opcion} value={opcion}>{ETIQUETAS_SESION[opcion]}</option>)}
        </select>
      </label>
      <label>
        Motivo de la resolución
        <textarea
          required
          rows={3}
          maxLength={MAX_MOTIVO_RESOLUCION}
          value={motivo}
          disabled={resolviendo || bloqueado}
          onChange={(evento) => onCambiar({ ...borrador, motivo: evento.target.value })}
        />
        <span className="tutorias__contador">{motivo.trim().length}/{MAX_MOTIVO_RESOLUCION}</span>
      </label>
      <label>
        Observaciones (opcional)
        <textarea
          rows={3}
          maxLength={MAX_OBSERVACIONES_RESOLUCION}
          value={observaciones}
          disabled={resolviendo || bloqueado}
          onChange={(evento) => onCambiar({ ...borrador, observaciones: evento.target.value })}
        />
        <span className="tutorias__contador">{observaciones.trim().length}/{MAX_OBSERVACIONES_RESOLUCION}</span>
      </label>
      <button
        className="boton-global boton-global--primario"
        type="submit"
        disabled={!estado || !motivo.trim() || resolviendo || bloqueado}
      >
        {resolviendo ? 'Resolviendo conflicto…' : 'Resolver conflicto'}
      </button>
    </form>
  )
}
