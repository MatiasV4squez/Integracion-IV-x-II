import type { FormEvent } from 'react'
import { RESULTADOS_CIERRE, type EntradaCierre, type ResultadoCierre } from '../models/tutoria'
import { ETIQUETAS_SESION } from '../utils/filtros-tutorias'

export interface BorradorCierre {
  resultado: ResultadoCierre | ''
  inasistente: string
}

interface Propiedades {
  participantes: { id: string; etiqueta: string }[]
  borrador: BorradorCierre
  onCambiar: (borrador: BorradorCierre) => void
  enviando: boolean
  bloqueado: boolean
  onEnviar: (entrada: EntradaCierre) => void
}

export function FormularioCierreTutoria({ participantes, borrador, onCambiar, enviando, bloqueado, onEnviar }: Propiedades) {
  const { resultado, inasistente } = borrador
  const requiereInasistente = resultado === 'INASISTENCIA'

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!resultado || enviando || bloqueado) return
    if (resultado === 'INASISTENCIA') {
      if (!participantes.some(({ id }) => id === inasistente)) return
      onEnviar({ resultado_declarado: resultado, id_usuario_inasistente: inasistente })
    } else {
      onEnviar({ resultado_declarado: resultado })
    }
  }

  return (
    <form className="tutorias__formulario-cierre" onSubmit={enviar} aria-label="Declarar cierre" aria-busy={enviando}>
      <p className="tutorias__texto-secundario">Cada participante envía su propia declaración. Si ambas coinciden, la sesión se cierra con ese resultado.</p>
      <label>
        Resultado de la sesión
        <select required value={resultado} disabled={enviando}
          onChange={(evento) => onCambiar({ resultado: evento.target.value as ResultadoCierre | '', inasistente: '' })}>
          <option value="">Selecciona un resultado</option>
          {RESULTADOS_CIERRE.map((opcion) => <option key={opcion} value={opcion}>{ETIQUETAS_SESION[opcion]}</option>)}
        </select>
      </label>
      {requiereInasistente && (
        <label>
          ¿Quién faltó?
          <select required value={inasistente} disabled={enviando}
            onChange={(evento) => onCambiar({ resultado, inasistente: evento.target.value })}>
            <option value="">Selecciona un participante</option>
            {participantes.map(({ id, etiqueta }) => <option key={id} value={id}>{etiqueta}</option>)}
          </select>
        </label>
      )}
      <button className="boton-global boton-global--primario" type="submit"
        disabled={!resultado || (requiereInasistente && !inasistente) || enviando || bloqueado}>
        {enviando ? 'Enviando declaración…' : 'Enviar declaración'}
      </button>
    </form>
  )
}
