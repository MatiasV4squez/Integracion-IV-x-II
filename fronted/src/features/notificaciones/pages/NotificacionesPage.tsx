import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { cerrarSesionUsuario } from '../../../shared/auth/usuario-autenticado'
import { Paginacion } from '../../../shared/components/Paginacion'
import { consultarNotificaciones } from '../services/notificaciones-api'
import './NotificacionesPage.css'

type Consulta = { estado: 'cargando' | 'error' } | Awaited<ReturnType<typeof consultarNotificaciones>>

const formatoFecha = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Santiago',
})

function BandejaNotificaciones({ token }: { token: string }) {
  const [pagina, setPagina] = useState(1)
  const [intento, setIntento] = useState(0)
  const [consulta, setConsulta] = useState<Consulta>({ estado: 'cargando' })
  const cargando = consulta.estado === 'cargando'

  useEffect(() => {
    const controlador = new AbortController()
    consultarNotificaciones(token, pagina, controlador.signal)
      .then((resultado) => {
        if (!controlador.signal.aborted) setConsulta(resultado)
      })
      .catch(() => {
        if (!controlador.signal.aborted) setConsulta({ estado: 'error' })
      })
    return () => controlador.abort()
  }, [token, pagina, intento])

  function actualizar() {
    setConsulta({ estado: 'cargando' })
    setIntento((anterior) => anterior + 1)
  }

  function cambiarPagina(nuevaPagina: number) {
    setConsulta({ estado: 'cargando' })
    setPagina(nuevaPagina)
  }

  return (
    <main className="notificaciones" aria-labelledby="titulo-notificaciones">
      <header className="notificaciones__encabezado">
        <h1 id="titulo-notificaciones">Notificaciones</h1>
        {consulta.estado !== 'sesion' && (
          <button className="boton-global boton-global--secundario" type="button" disabled={cargando} onClick={actualizar}>
            {consulta.estado === 'error' ? 'Reintentar' : 'Actualizar'}
          </button>
        )}
      </header>
      {cargando && <p className="notificaciones__estado" role="status">Cargando notificaciones…</p>}
      {consulta.estado === 'error' && <p className="notificaciones__estado" role="alert">No pudimos cargar tus notificaciones.</p>}
      {consulta.estado === 'sesion' && (
        <div className="notificaciones__estado">
          <p role="alert">Tu sesión venció. Inicia sesión para consultar tus notificaciones.</p>
          <Link className="boton-global boton-global--primario" to="/login" state={{ desde: '/notificaciones' }} onClick={cerrarSesionUsuario}>
            Iniciar sesión
          </Link>
        </div>
      )}
      {consulta.estado === 'lista' && (
        <>
          {consulta.resultado.datos.length === 0 ? (
            <div className="notificaciones__estado">
              <p role="status">{pagina === 1 ? 'Aún no tienes notificaciones.' : 'No hay notificaciones en esta página.'}</p>
              {pagina > 1 && (
                <button className="boton-global boton-global--secundario" type="button" onClick={() => cambiarPagina(1)}>
                  Volver a la primera página
                </button>
              )}
            </div>
          ) : (
            <ul className="notificaciones__lista" aria-label="Tus notificaciones">
              {consulta.resultado.datos.map((notificacion) => (
                <li key={notificacion.id}>
                  <p>{notificacion.mensaje}</p>
                  <time dateTime={notificacion.creadoEn}>{formatoFecha.format(new Date(notificacion.creadoEn))}</time>
                </li>
              ))}
            </ul>
          )}
          <Paginacion page={pagina} totalPages={consulta.resultado.paginacion.total_paginas} onCambiarPagina={cambiarPagina} />
        </>
      )}
    </main>
  )
}

export default function NotificacionesPage() {
  const sesion = useSesionUsuario()
  return sesion ? <BandejaNotificaciones key={sesion.token} token={sesion.token} /> : null
}
