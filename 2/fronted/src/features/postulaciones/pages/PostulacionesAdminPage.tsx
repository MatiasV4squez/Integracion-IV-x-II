import { useState } from 'react'
import { Link } from 'react-router'
import type { ConsultaPostulaciones, Postulacion } from '../models/postulacion'
import { sanitizarTexto } from '../../../shared/utils/validaciones-formulario'
import { convertirNota, validarMotivoIngresado, validarNotaIngresada } from '../utils/validar-revision'
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
  revisionEnCurso?: string | null
  revisionBloqueada?: boolean
  mensajeRevision?: string | null
  errorRevision?: string | null
  onAprobar: (postulacion: Postulacion, nota: number) => void
  onRechazar: (postulacion: Postulacion, motivo: string) => void
}

interface PropiedadesRevision {
  postulacion: Postulacion
  procesando: boolean
  deshabilitado: boolean
  onAprobar: (postulacion: Postulacion, nota: number) => void
  onRechazar: (postulacion: Postulacion, motivo: string) => void
}

function fechaLegible(fecha: string | null) {
  if (!fecha) return 'Sin registrar'
  return new Date(fecha).toLocaleString('es-CL', { timeZone: 'America/Santiago' })
}

function FormularioRevision({ postulacion, procesando, deshabilitado, onAprobar, onRechazar }: PropiedadesRevision) {
  const [nota, establecerNota] = useState('')
  const [motivo, establecerMotivo] = useState('')
  const [errorNota, establecerErrorNota] = useState<string | undefined>()
  const [errorMotivo, establecerErrorMotivo] = useState<string | undefined>()

  function aprobar() {
    const error = validarNotaIngresada(nota)
    establecerErrorNota(error)
    if (!error) onAprobar(postulacion, convertirNota(nota))
  }

  function rechazar() {
    const error = validarMotivoIngresado(motivo)
    establecerErrorMotivo(error)
    if (!error) onRechazar(postulacion, sanitizarTexto(motivo))
  }

  return (
    <section aria-label="Revisar postulación">
      <h3>Revisar postulación</h3>

      <label htmlFor="nota-acreditada">Nota acreditada (5,0 a 7,0)</label>
      <input
        id="nota-acreditada"
        type="number"
        min="5"
        max="7"
        step="0.1"
        value={nota}
        disabled={deshabilitado}
        aria-invalid={errorNota ? true : undefined}
        aria-describedby={errorNota ? 'nota-acreditada-error' : undefined}
        onChange={(evento) => establecerNota(evento.target.value)}
      />
      {errorNota && <p id="nota-acreditada-error" role="alert">{errorNota}</p>}
      <button type="button" disabled={deshabilitado} onClick={aprobar}>
        {procesando ? 'Procesando revisión…' : 'Aprobar postulación'}
      </button>

      <label htmlFor="motivo-rechazo">Motivo de rechazo</label>
      <textarea
        id="motivo-rechazo"
        maxLength={500}
        value={motivo}
        disabled={deshabilitado}
        aria-invalid={errorMotivo ? true : undefined}
        aria-describedby={errorMotivo ? 'motivo-rechazo-error' : undefined}
        onChange={(evento) => establecerMotivo(evento.target.value)}
      />
      {errorMotivo && <p id="motivo-rechazo-error" role="alert">{errorMotivo}</p>}
      <button type="button" disabled={deshabilitado} onClick={rechazar}>
        Rechazar postulación
      </button>
    </section>
  )
}

export default function PostulacionesAdminPage({
  acceso, consulta, seleccionada = null, descargando = false, errorCertificado = null,
  revisionEnCurso = null, revisionBloqueada = false, mensajeRevision = null, errorRevision = null,
  onRecargar, onSeleccionar, onDescargar, onAprobar, onRechazar,
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
      {mensajeRevision && <p role="status">{mensajeRevision}</p>}
      {errorRevision && <p role="alert">{errorRevision}</p>}
      <button type="button" disabled={consulta.estado === 'cargando' || revisionEnCurso !== null} onClick={onRecargar}>
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
          {detalle.estado === 'PENDIENTE' && (
            // La key reinicia la nota y el motivo al cambiar de postulación.
            <FormularioRevision
              key={detalle.idPostulacion}
              postulacion={detalle}
              procesando={revisionEnCurso === detalle.idPostulacion}
              deshabilitado={revisionEnCurso !== null || revisionBloqueada}
              onAprobar={onAprobar}
              onRechazar={onRechazar}
            />
          )}
          {errorCertificado && <p role="alert">{errorCertificado}</p>}
        </section>
      )}
    </main>
  )
}
