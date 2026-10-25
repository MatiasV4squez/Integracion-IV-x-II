import { Link } from 'react-router'
import type { ConsultaPostulaciones, Postulacion } from '../models/postulacion'
import './PostulacionesAdminPage.css'

interface Propiedades {
  acceso?: 'sesion' | 'permiso'
  consulta: ConsultaPostulaciones
  seleccionada?: string | null
  descargando?: boolean
  errorCertificado?: string | null
  onRecargar: () => void
  onSeleccionar: (id: string) => void
  onDescargar: (postulacion: Postulacion) => void
}

function fechaLegible(fecha: string | null) {
  if (!fecha) return 'Sin registrar'
  return new Date(fecha).toLocaleString('es-CL', { timeZone: 'America/Santiago' })
}

export default function PostulacionesAdminPage({
  acceso, consulta, seleccionada = null, descargando = false, errorCertificado = null,
  onRecargar, onSeleccionar, onDescargar,
}: Propiedades) {
  if (acceso) return (
    <main className="post-admin">
      <h1>Administrar postulaciones</h1>
      <p role="alert">{acceso === 'sesion'
        ? 'Debes iniciar sesión con una cuenta de administrador.'
        : 'No tienes permisos para consultar esta sección.'}</p>
      <Link to={acceso === 'sesion' ? '/login' : '/materias'}>
        {acceso === 'sesion' ? 'Iniciar sesión' : 'Ir a materias'}
      </Link>
    </main>
  )

  const postulaciones = consulta.estado === 'listo' ? consulta.postulaciones : []
  const detalle = postulaciones.find((postulacion) => postulacion.idPostulacion === seleccionada)

  return (
    <main className="post-admin" aria-busy={consulta.estado === 'cargando'}>
      <h1>Administrar postulaciones</h1>
      <p>Consulta las postulaciones pendientes y revisa sus certificados.</p>
      <button type="button" disabled={consulta.estado === 'cargando'} onClick={onRecargar}>
        {consulta.estado === 'error' ? 'Reintentar consulta' : 'Actualizar listado'}
      </button>

      {consulta.estado === 'cargando' && <p role="status">Cargando postulaciones…</p>}
      {consulta.estado === 'error' && <p role="alert">{consulta.mensaje}</p>}

      {consulta.estado === 'listo' && (
        <section aria-label="Postulaciones pendientes">
          <h2>Pendientes ({postulaciones.length})</h2>
          {postulaciones.length === 0
            ? <p>No hay postulaciones pendientes.</p>
            : <ul className="post-admin__lista">
                {postulaciones.map((postulacion) => (
                  <li key={postulacion.idPostulacion}>
                    <span>
                      Postulación #{postulacion.idPostulacion} — Usuario {postulacion.idUsuario}
                      {postulacion.estado === 'PENDIENTE_ROL' && ' — Pendiente de asignación de rol'}
                    </span>
                    <button
                      type="button"
                      aria-expanded={postulacion.idPostulacion === seleccionada}
                      aria-controls={postulacion.idPostulacion === seleccionada ? 'post-admin-detalle' : undefined}
                      aria-label={`Ver detalles de la postulación ${postulacion.idPostulacion}`}
                      onClick={() => onSeleccionar(postulacion.idPostulacion)}
                    >Ver detalles</button>
                  </li>
                ))}
              </ul>}
        </section>
      )}

      {detalle && (
        <section id="post-admin-detalle" className="post-admin__detalle" aria-labelledby="post-admin-detalle-titulo">
          <h2 id="post-admin-detalle-titulo">Detalle de postulación #{detalle.idPostulacion}</h2>
          <dl>
            <dt>Usuario</dt><dd>{detalle.idUsuario}</dd>
            <dt>Materia</dt><dd>{detalle.idMateria}</dd>
            <dt>Estado</dt><dd>{detalle.estado === 'PENDIENTE_ROL' ? 'Pendiente de asignación de rol' : 'Pendiente'}</dd>
            <dt>Fecha de postulación</dt><dd>{fechaLegible(detalle.fechaPostulacion)}</dd>
            <dt>Certificado</dt><dd>{detalle.certificadoNombre}</dd>
            <dt>Tipo de archivo</dt><dd>{detalle.certificadoTipo}</dd>
            <dt>Nota acreditada</dt><dd>{detalle.notaAcreditada ?? 'Sin registrar'}</dd>
            <dt>Fecha de revisión</dt><dd>{fechaLegible(detalle.fechaRevision)}</dd>
            <dt>Administrador revisor</dt><dd>{detalle.idAdministradorRevision ?? 'Sin asignar'}</dd>
            <dt>Motivo de rechazo</dt><dd>{detalle.motivoRechazo ?? 'No corresponde'}</dd>
          </dl>
          <button type="button" disabled={descargando} onClick={() => onDescargar(detalle)}>
            {descargando ? 'Descargando…' : 'Descargar certificado'}
          </button>
          {errorCertificado && <p role="alert">{errorCertificado}</p>}
        </section>
      )}
    </main>
  )
}
