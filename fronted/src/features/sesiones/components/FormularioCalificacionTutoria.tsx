import { esPuntuacionTutoria } from '../utils/validar-tutoria'

interface Propiedades {
  contraparte: string
  puntuacion: number
  onCambiar: (puntuacion: number) => void
  onEnviar: (puntuacion: number) => void
  enviando: boolean
  bloqueado: boolean
}

export function FormularioCalificacionTutoria({ contraparte, puntuacion, onCambiar, onEnviar, enviando, bloqueado }: Propiedades) {
  const puedeEnviar = esPuntuacionTutoria(puntuacion) && !enviando && !bloqueado
  return (
    <form className="tutorias__formulario" aria-label="Calificar tutoría" aria-busy={enviando} onSubmit={(evento) => {
      evento.preventDefault()
      if (puedeEnviar) onEnviar(puntuacion)
    }}>
      <label>
        Calificación para {contraparte}
        <select required value={puntuacion || ''} disabled={enviando || bloqueado}
          onChange={(evento) => onCambiar(Number(evento.target.value))}>
          <option value="">Selecciona una calificación</option>
          {[1, 2, 3, 4, 5].map((valor) => <option key={valor} value={valor}>{valor} de 5</option>)}
        </select>
      </label>
      <button className="boton-global boton-global--primario" type="submit" disabled={!puedeEnviar}>
        {enviando ? 'Enviando calificación…' : 'Enviar calificación'}
      </button>
    </form>
  )
}
