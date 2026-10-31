import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Materia } from '../../materias/models/materia'
import type { ConsultaPostulaciones } from '../models/postulacion'
import {
  DESCRIPCION_ESTADO_POSTULACION, ESTADOS_POSTULACION_ACTIVA, type EstadoEnvioPostulacion,
} from '../models/postulacion-tutor'
import { validarCertificado } from '../utils/validar-certificado'
import './PostulacionTutorPage.css'

type ConsultaMaterias =
  | { estado: 'cargando' }
  | { estado: 'listo'; materias: Materia[] }
  | { estado: 'error'; mensaje: string }

interface Propiedades {
  materias: ConsultaMaterias
  historial: ConsultaPostulaciones
  envio: EstadoEnvioPostulacion
  versionFormulario: number
  onRecargarMaterias: () => void
  onRecargarHistorial: () => void
  onEnviar: (idMateria: string, certificado: File) => void
}

function fechaLegible(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'medium' })
}

function FormularioPostulacion({ materias, enviando, onEnviar }: {
  materias: Materia[]
  enviando: boolean
  onEnviar: Propiedades['onEnviar']
}) {
  const [idMateria, setIdMateria] = useState('')
  const [certificado, setCertificado] = useState<File | null>(null)
  const [errores, setErrores] = useState<{ materia?: string; certificado?: string }>({})
  const ultimoArchivo = useRef<File | null>(null)

  async function cambiarCertificado(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.currentTarget.files?.[0] ?? null
    ultimoArchivo.current = archivo
    setCertificado(archivo)
    if (!archivo) return
    const validacion = await validarCertificado(archivo)
    // Ignora resultados de un archivo que ya fue reemplazado.
    if (ultimoArchivo.current !== archivo) return
    setErrores((previos) => ({ ...previos, certificado: 'error' in validacion ? validacion.error : undefined }))
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    const formulario = evento.currentTarget
    const validacion = await validarCertificado(certificado)
    const siguientes = {
      materia: materias.some((materia) => materia.idMateria === idMateria) ? undefined : 'Selecciona la materia a la que postulas.',
      certificado: 'error' in validacion ? validacion.error : undefined,
    }
    setErrores(siguientes)
    const primerError = siguientes.materia ? 'idMateria' : siguientes.certificado ? 'certificado' : undefined
    if (primerError || !certificado) {
      formulario.querySelector<HTMLElement>(`[name="${primerError}"]`)?.focus()
      return
    }
    onEnviar(idMateria, certificado)
  }

  return (
    <form className="post-tutor__formulario" onSubmit={(evento) => { void enviar(evento) }} noValidate>
      <div className="post-tutor__campo">
        <label htmlFor="postulacion-materia">Materia</label>
        <select
          id="postulacion-materia"
          name="idMateria"
          value={idMateria}
          disabled={enviando}
          required
          onChange={(evento) => {
            setIdMateria(evento.currentTarget.value)
            setErrores((previos) => ({ ...previos, materia: undefined }))
          }}
          aria-invalid={errores.materia ? true : undefined}
          aria-describedby={errores.materia ? 'error-postulacion-materia' : undefined}
        >
          <option value="">Selecciona una materia</option>
          {materias.map((materia) => (
            <option key={materia.idMateria} value={materia.idMateria}>{materia.codigo} · {materia.nombre}</option>
          ))}
        </select>
        {errores.materia && <p id="error-postulacion-materia" className="post-tutor__error" role="alert">{errores.materia}</p>}
      </div>

      <div className="post-tutor__campo">
        <label htmlFor="postulacion-certificado">Certificado de notas</label>
        <input
          type="file"
          id="postulacion-certificado"
          name="certificado"
          accept=".pdf,.png,application/pdf,image/png"
          disabled={enviando}
          required
          onChange={(evento) => { void cambiarCertificado(evento) }}
          aria-invalid={errores.certificado ? true : undefined}
          aria-describedby={'ayuda-postulacion-certificado' + (errores.certificado ? ' error-postulacion-certificado' : '')}
        />
        <p id="ayuda-postulacion-certificado" className="post-tutor__ayuda">
          Adjunta el certificado donde se vea tu nota en la materia. Formato PDF o PNG, máximo 5 MB.
        </p>
        {errores.certificado && (
          <p id="error-postulacion-certificado" className="post-tutor__error" role="alert">{errores.certificado}</p>
        )}
      </div>

      <button type="submit" className="boton-global boton-global--primario" disabled={enviando}>
        {enviando ? 'Enviando postulación…' : 'Enviar postulación'}
      </button>
    </form>
  )
}

export default function PostulacionTutorPage({
  materias, historial, envio, versionFormulario, onRecargarMaterias, onRecargarHistorial, onEnviar,
}: Propiedades) {
  const catalogo = materias.estado === 'listo' ? materias.materias : []
  const nombres = new Map(catalogo.map((materia) => [materia.idMateria, materia.nombre]))
  const postulaciones = historial.estado === 'listo' ? historial.postulaciones : []
  const activas = new Set(postulaciones
    .filter((postulacion) => ESTADOS_POSTULACION_ACTIVA.includes(postulacion.estado))
    .map((postulacion) => postulacion.idMateria))
  const disponibles = catalogo.filter((materia) => !activas.has(materia.idMateria))
  const enviando = envio.estado === 'enviando'

  return (
    <main className="post-tutor">
      <header className="post-tutor__encabezado">
        <h1>Postular como tutor</h1>
        <p>Elige una materia que hayas aprobado y adjunta tu certificado. La administración revisará tu nota antes de habilitarte como tutor.</p>
      </header>

      <section className="post-tutor__tarjeta" aria-labelledby="postulacion-nueva-titulo" aria-busy={enviando}>
        <h2 id="postulacion-nueva-titulo">Nueva postulación</h2>
        <div role="status" aria-live="polite">
          {envio.estado === 'exitoso' && (
            <p className="post-tutor__aviso post-tutor__aviso--exito">
              <strong>Postulación enviada.</strong> Tu postulación a {nombres.get(envio.postulacion.idMateria) ?? 'la materia'} quedó en revisión.
            </p>
          )}
        </div>
        {envio.estado === 'error' && <p className="post-tutor__aviso post-tutor__aviso--error" role="alert">{envio.mensaje}</p>}

        {materias.estado === 'cargando' && <p role="status">Cargando materias…</p>}
        {materias.estado === 'error' && (
          <div className="post-tutor__aviso post-tutor__aviso--error" role="alert">
            <p>{materias.mensaje}</p>
            <button type="button" className="boton-global boton-global--secundario" onClick={onRecargarMaterias}>Reintentar</button>
          </div>
        )}
        {materias.estado === 'listo' && disponibles.length === 0 && (
          <p>{catalogo.length === 0
            ? 'Todavía no hay materias disponibles para postular.'
            : 'Ya tienes una postulación activa o aprobada en todas las materias disponibles.'}</p>
        )}
        {materias.estado === 'listo' && disponibles.length > 0 && (
          <FormularioPostulacion key={versionFormulario} materias={disponibles} enviando={enviando} onEnviar={onEnviar} />
        )}
      </section>

      <section className="post-tutor__tarjeta" aria-labelledby="postulacion-historial-titulo" aria-busy={historial.estado === 'cargando'}>
        <div className="post-tutor__titulo-seccion">
          <h2 id="postulacion-historial-titulo">Mis postulaciones</h2>
          <button
            type="button"
            className="boton-global boton-global--secundario"
            disabled={historial.estado === 'cargando'}
            onClick={onRecargarHistorial}
          >
            {historial.estado === 'error' ? 'Reintentar' : 'Actualizar'}
          </button>
        </div>
        {historial.estado === 'cargando' && <p role="status">Cargando tus postulaciones…</p>}
        {historial.estado === 'error' && <p className="post-tutor__aviso post-tutor__aviso--error" role="alert">{historial.mensaje}</p>}
        {historial.estado === 'listo' && postulaciones.length === 0 && <p>Aún no has enviado postulaciones.</p>}
        {postulaciones.length > 0 && (
          <ul className="post-tutor__historial">
            {postulaciones.map((postulacion) => {
              const descripcion = DESCRIPCION_ESTADO_POSTULACION[postulacion.estado]
              return (
                <li key={postulacion.idPostulacion}>
                  <div>
                    <strong>{nombres.get(postulacion.idMateria) ?? 'Materia #' + postulacion.idMateria}</strong>
                    <span>Enviada el {fechaLegible(postulacion.fechaPostulacion)} · {postulacion.certificadoNombre}</span>
                  </div>
                  <span className={'post-tutor__estado post-tutor__estado--' + postulacion.estado.toLowerCase()}>
                    {descripcion.etiqueta}
                  </span>
                  <p>
                    {descripcion.detalle}
                    {postulacion.notaAcreditada !== null && ` Nota acreditada: ${postulacion.notaAcreditada.toFixed(1)}.`}
                    {postulacion.motivoRechazo && ` Motivo: ${postulacion.motivoRechazo}`}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
