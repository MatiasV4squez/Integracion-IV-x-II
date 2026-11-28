import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { cerrarSesionUsuario } from '../../../shared/auth/usuario-autenticado'
import { useCrearReporte } from '../hooks/useCrearReporte'

interface Propiedades {
  token: string
  idSesion: string
  idUsuarioReportado: string
}

export function FormularioReporte({ token, idSesion, idUsuarioReportado }: Propiedades) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [intentoEnviar, setIntentoEnviar] = useState(false)
  const { envio, enviar } = useCrearReporte(token)
  const ubicacion = useLocation()

  const enviando = envio.estado === 'enviando'
  const bloqueado = enviando || envio.estado === 'incierto' || envio.estado === 'sesion'
  const faltaTitulo = intentoEnviar && !titulo.trim()
  const faltaDescripcion = intentoEnviar && !descripcion.trim()
  const volverATutoria = `/panel/tutorias/${idSesion}`

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueado) return
    setIntentoEnviar(true)
    if (!titulo.trim() || !descripcion.trim()) return

    void enviar({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      id_sesion: idSesion,
      id_usuario_reportado: idUsuarioReportado,
    })
  }

  if (envio.estado === 'enviado') {
    return (
      <section className="crear-reporte__tarjeta">
        <p role="status">Tu reporte se registró correctamente.</p>
        <Link className="boton-global boton-global--primario" to={volverATutoria}>Volver a la tutoría</Link>
      </section>
    )
  }

  return (
    <section className="crear-reporte__tarjeta">
      <form onSubmit={manejarEnvio} noValidate aria-busy={enviando}>
        <fieldset disabled={bloqueado}>
          <legend>Datos del reporte</legend>

          <label>
            Título
            <input
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              aria-invalid={faltaTitulo || undefined}
              aria-describedby={faltaTitulo ? 'reporte-campos-obligatorios' : undefined}
              required
            />
          </label>

          <label>
            Descripción
            <textarea
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              rows={5}
              aria-invalid={faltaDescripcion || undefined}
              aria-describedby={faltaDescripcion ? 'reporte-campos-obligatorios' : undefined}
              required
            />
          </label>

          {(faltaTitulo || faltaDescripcion) && (
            <p id="reporte-campos-obligatorios" role="alert">Completa el título y la descripción.</p>
          )}
          {envio.estado !== 'incierto' && envio.estado !== 'sesion' && (
            <button className="boton-global boton-global--primario" type="submit">
              {enviando ? 'Enviando…' : envio.estado === 'error' ? 'Reintentar envío' : 'Enviar reporte'}
            </button>
          )}
        </fieldset>
      </form>
      {enviando && <p role="status">Estamos enviando tu reporte.</p>}
      {(envio.estado === 'error' || envio.estado === 'incierto' || envio.estado === 'sesion') && (
        <p role="alert">{envio.mensaje}</p>
      )}
      {envio.estado === 'incierto' && (
        <Link className="boton-global boton-global--secundario" to={volverATutoria}>Volver a la tutoría</Link>
      )}
      {envio.estado === 'sesion' && (
        <Link
          className="boton-global boton-global--primario"
          to="/login"
          state={{ desde: ubicacion.pathname + ubicacion.search }}
          onClick={cerrarSesionUsuario}
        >
          Iniciar sesión
        </Link>
      )}
    </section>
  )
}
