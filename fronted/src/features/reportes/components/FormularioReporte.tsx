import { useState, type FormEvent } from 'react'
import { useCrearReporte } from '../hooks/useCrearReporte'

interface Propiedades {
  token: string
  idSesion: string
  idUsuarioReportado: string
}

export function FormularioReporte({token, idSesion,idUsuarioReportado}: Propiedades) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [errorValidacion, setErrorValidacion] = useState('')
  const { envio, enviar } = useCrearReporte(token)

  const bloqueado = envio.estado === 'enviando' || envio.estado === 'enviado' || envio.estado === 'incierto'

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueado) return

    if (!titulo.trim() || !descripcion.trim()) {
      setErrorValidacion('Completa el título y la descripción.')
      return
    }

    setErrorValidacion('')
    void enviar({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      id_sesion: idSesion,
      id_usuario_reportado: idUsuarioReportado,
    })
  }

  return (
    <section>
      <h2>Reportar un problema</h2>

      <form onSubmit={manejarEnvio} aria-busy={envio.estado === 'enviando'}>
        <fieldset disabled={bloqueado}>
          <legend>Datos del reporte</legend>

          <label>
            Título
            <input
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              required
            />
          </label>

          <label>
            Descripción
            <textarea
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              rows={5}
              required
            />
          </label>

          <button type="submit">
            {envio.estado === 'enviando'
              ? 'Enviando…'
              : envio.estado === 'error'
                ? 'Reintentar envío'
                : 'Enviar reporte'}
          </button>
        </fieldset>

        {errorValidacion && <p role="alert">{errorValidacion}</p>}

        {envio.estado === 'enviando' && (
          <p role="status">Estamos enviando tu reporte.</p>
        )}

        {envio.estado === 'enviado' && (
          <p role="status">Tu reporte se registró correctamente.</p>
        )}

        {(envio.estado === 'error' || envio.estado === 'incierto') && (
          <p role="alert">{envio.mensaje}</p>
        )}
      </form>
    </section>
  )
}