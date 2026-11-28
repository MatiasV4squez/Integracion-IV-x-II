import { useState } from 'react'
import { Link } from 'react-router'
import type { ConsultaTutorias, DetalleTutoria, EntradaCierre } from '../models/tutoria'
import { EstadoConsultaTutorias } from '../components/EstadoConsultaTutorias'
import { EstadoTutoria } from '../components/EstadoTutoria'
import { AccionCancelarSesion, ResultadoCancelacionSesion } from '../components/CancelacionSesion'
import type { CancelacionSesiones } from '../hooks/useCancelarSesion'
import { FormularioCierreTutoria, type BorradorCierre } from '../components/FormularioCierreTutoria'
import { FormularioCalificacionTutoria } from '../components/FormularioCalificacionTutoria'
import type { ErrorCalificarTutoria } from '../services/calificar-tutoria-api'
import { FormularioResolucionConflicto, type BorradorResolucion } from '../components/FormularioResolucionConflicto'
import type { ErrorDeclararCierre } from '../services/declarar-cierre-api'
import type { EntradaResolucionConflicto, ErrorResolverConflicto } from '../services/resolver-conflicto-api'
import { enlaceEncuentroSeguro, ETIQUETAS_SESION } from '../utils/filtros-tutorias'
import { formatearHorarioSesion } from '../utils/solicitudes-recibidas'
import './Tutorias.css'

interface Propiedades {
  consulta: ConsultaTutorias<DetalleTutoria>
  idUsuario: string
  materia?: string
  nombres: ReadonlyMap<string, string>
  volver: string
  onRecargar: () => void
  cancelacion?: CancelacionSesiones
  calificacion?: {
    enviar: (puntuacion: number) => void
    enviando: boolean
    enviada: boolean
    error: ErrorCalificarTutoria | null
  }
  cierre?: {
    enviar: (entrada: EntradaCierre) => void
    enviando: boolean
    enviado: boolean
    error: ErrorDeclararCierre | null
  }
  resolucion?: {
    resolver: (entrada: EntradaResolucionConflicto) => void
    resolviendo: boolean
    resuelto: boolean
    error: ErrorResolverConflicto | null
  }
  etiquetaVolver?: string
}

const fechaDeclaracion = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago',
})

export default function DetalleTutoriaPage({ consulta, idUsuario, materia, nombres, volver, etiquetaVolver = '← Volver a Mi panel', onRecargar, cierre, resolucion, cancelacion, calificacion }: Propiedades) {
  const [borradorCierre, setBorradorCierre] = useState<BorradorCierre>({ resultado: '', inasistente: '' })
  const [puntuacion, setPuntuacion] = useState(0)
  const [borradorResolucion, setBorradorResolucion] = useState<BorradorResolucion>({ estado: '', motivo: '', observaciones: '' })
  const tutoria = consulta.estado === 'listo' ? consulta.datos : null
  const nombre = (id: string) => nombres.get(id) ?? (id === tutoria?.id_tutor ? 'Tutor #' : 'Estudiante #') + id
  const encuentro = tutoria?.datos_encuentro
  const enlace = encuentro ? enlaceEncuentroSeguro(encuentro.enlace) : undefined
  const esParticipante = tutoria && (tutoria.id_tutor === idUsuario || tutoria.id_tutee === idUsuario)
  const puedeCalificar = esParticipante && tutoria.estado_sesion === 'COMPLETADA' && tutoria.acciones_disponibles.calificar
    && !tutoria.calificaciones.some((nota) => nota.id_evaluador === idUsuario)
  return <main className="tutorias" aria-labelledby="detalle-tutoria-titulo">
    <Link className="tutorias__volver" to={volver}>{etiquetaVolver}</Link>
    <div className="tutorias__encabezado"><div><h1 id="detalle-tutoria-titulo">Detalle de tutoría</h1>
      <p className="tutorias__subtitulo">La información de tu encuentro y el resultado de la sesión.</p></div>
      <button className="boton-global boton-global--secundario" type="button" onClick={onRecargar}
        disabled={consulta.estado === 'cargando' || cierre?.enviando || resolucion?.resolviendo || calificacion?.enviando || cancelacion?.puedeActualizar === false}>Actualizar</button></div>
    <ResultadoCancelacionSesion cancelacion={cancelacion} />
    {calificacion?.enviada && <p className="tutorias__aviso" role="status">Tu calificación quedó registrada.</p>}
    {consulta.estado === 'cargando' ? <EstadoConsultaTutorias estado="cargando" />
      : consulta.estado === 'error' ? <EstadoConsultaTutorias estado="error" tipo={consulta.tipo} mensaje={consulta.mensaje} onReintentar={onRecargar} />
        : tutoria && encuentro && <>
          <section className="tutorias__destacado" aria-label="Resumen de la tutoría">
            <div><p className="tutorias__referencia">Tutoría #{tutoria.id_sesion}</p><h2>{materia ?? 'Materia #' + tutoria.id_materia}</h2>
              <p><time dateTime={tutoria.inicio}>{formatearHorarioSesion(tutoria.inicio, tutoria.fin)}</time></p></div>
            <EstadoTutoria estado={tutoria.estado_sesion} />
          </section>
          {tutoria.resultado_provisional && <div className="tutorias__aviso" role="status">Este resultado es provisional: se registró al vencer el plazo de respuesta de la contraparte.</div>}
          <div className="tutorias__detalle-columnas">
            <section className="tutorias__panel" aria-labelledby="datos-encuentro-titulo"><h2 id="datos-encuentro-titulo">Datos del encuentro</h2>
              <dl className="tutorias__datos"><div><dt>Modalidad</dt><dd>{encuentro.modalidad === 'PRESENCIAL' ? 'Presencial' : encuentro.modalidad === 'EN_LINEA' ? 'En línea' : 'Por definir'}</dd></div>
                <div><dt>Lugar</dt><dd>{encuentro.lugar?.trim() || 'Por definir'}</dd></div>
                <div><dt>Enlace de reunión</dt><dd>{enlace ? <a href={enlace} target="_blank" rel="noopener noreferrer" className="tutorias__enlace-reunion">Abrir reunión <span className="tutorias__solo-lectores">(se abre en otra pestaña)</span></a>
                  : encuentro.enlace ? 'El enlace de reunión no está disponible.' : 'Por definir'}</dd></div>
                <div><dt>Horario</dt><dd>Hora de Chile continental · America/Santiago</dd></div></dl>
            </section>
            <section className="tutorias__panel" aria-labelledby="participantes-titulo"><h2 id="participantes-titulo">Participantes</h2>
              <dl className="tutorias__datos">{([['Tutor', tutoria.id_tutor], ['Estudiante', tutoria.id_tutee]] as const).map(([rol, id]) =>
                <div key={rol}><dt>{rol}</dt><dd>{nombre(id)}{id === idUsuario && <span className="tutorias__tu">Tú</span>}</dd></div>)}</dl>
              <div className="tutorias__acciones">
                {tutoria.id_tutor === idUsuario && tutoria.acciones_disponibles.aceptar &&
                  <Link className="boton-global boton-global--secundario" to="/solicitudes/recibidas">Gestionar solicitud</Link>}
                <AccionCancelarSesion sesion={tutoria} cancelacion={cancelacion} permitida={tutoria.acciones_disponibles.cancelar}
                  bloqueada={cierre?.enviando || resolucion?.resolviendo} />
                {(tutoria.id_tutor === idUsuario || tutoria.id_tutee === idUsuario) && [
                  'CONFIRMADA',
                  'PENDIENTE_CIERRE',
                  'COMPLETADA',
                  'NO_REALIZADA',
                  'INASISTENCIA',
                  'EN_CONFLICTO',
                ].includes(tutoria.estado_sesion) && (
                  <Link
                    className="boton-global boton-global--secundario"
                    to={`/reportes/nuevo?sesionId=${tutoria.id_sesion}&usuarioReportadoId=${
                      tutoria.id_tutor === idUsuario
                        ? tutoria.id_tutee
                        : tutoria.id_tutor
                    }`}
                  >
                    Reportar problema
                  </Link>
                )}
              </div>
            </section>
            <section className="tutorias__panel" aria-labelledby="cierre-tutoria-titulo"><h2 id="cierre-tutoria-titulo">Cierre de la sesión</h2>
              {tutoria.declaraciones.length === 0 ? <p className="tutorias__texto-secundario">Todavía no hay declaraciones de cierre para esta sesión.</p>
                : <ul className="tutorias__registros">{tutoria.declaraciones.map((declaracion) => <li key={declaracion.id_declaracion}>
                  <strong>{nombre(declaracion.id_usuario)}{declaracion.id_usuario === idUsuario ? ' (tú)' : ''}</strong>
                  <p>{ETIQUETAS_SESION[declaracion.resultado_declarado]}</p>
                  {declaracion.id_usuario_inasistente && <p>Inasistencia de {nombre(declaracion.id_usuario_inasistente)}</p>}
                  <time dateTime={declaracion.fecha_declaracion}>{fechaDeclaracion.format(new Date(declaracion.fecha_declaracion))}</time>
                </li>)}</ul>}
              {cierre?.error && <p className="tutorias__error-cierre" role="alert">{cierre.error.message}</p>}
              {cierre?.enviado && <p className="tutorias__nota" role="status">Tu declaración quedó registrada.</p>}
              {tutoria.estado_sesion === 'PENDIENTE_CIERRE' &&
                tutoria.declaraciones.some((declaracion) => declaracion.id_usuario === idUsuario) &&
                <p className="tutorias__nota">Pendiente de la declaración del otro participante.</p>}
              {cierre && !cierre.enviado && tutoria.acciones_disponibles.declarar_cierre &&
                (tutoria.id_tutor === idUsuario || tutoria.id_tutee === idUsuario) &&
                <FormularioCierreTutoria
                  borrador={borradorCierre} onCambiar={setBorradorCierre}
                  participantes={[...new Set([tutoria.id_tutor, tutoria.id_tutee])].map((id) => ({
                    id, etiqueta: nombre(id) + (id === idUsuario ? ' (tú)' : ''),
                  }))}
                  enviando={cierre.enviando} bloqueado={cierre.error?.comprobarEstado ?? false} onEnviar={cierre.enviar} />}
              {tutoria.estado_sesion === 'EN_CONFLICTO' && <p className="tutorias__nota">Las declaraciones requieren revisión de administración.</p>}
              {resolucion?.error && <p className="tutorias__error-cierre" role="alert">{resolucion.error.message}</p>}
              {resolucion?.resuelto && <p className="tutorias__nota" role="status">El conflicto se resolvió correctamente.</p>}
              {resolucion && !resolucion.resuelto && tutoria.acciones_disponibles.resolver_conflicto &&
                <FormularioResolucionConflicto
                  borrador={borradorResolucion} onCambiar={setBorradorResolucion}
                  resolviendo={resolucion.resolviendo} bloqueado={resolucion.error?.comprobarEstado ?? false}
                  onEnviar={resolucion.resolver} />}
            </section>
            <section className="tutorias__panel" aria-labelledby="calificaciones-titulo"><h2 id="calificaciones-titulo">Calificaciones</h2>
              {tutoria.calificaciones.length === 0 ? <p className="tutorias__texto-secundario">Esta sesión todavía no tiene calificaciones.</p>
                : <ul className="tutorias__registros">{tutoria.calificaciones.map((nota) => <li key={nota.id_calificacion}>
                  <strong>{nota.id_evaluador === idUsuario ? 'Tu calificación a ' + nombre(nota.id_evaluado)
                    : nota.id_evaluado === idUsuario ? 'Calificación recibida de ' + nombre(nota.id_evaluador)
                      : nombre(nota.id_evaluador) + ' a ' + nombre(nota.id_evaluado)}</strong>
                  <p className="tutorias__puntuacion"><span aria-hidden="true">★ </span>{nota.puntuacion} de 5</p>
                  <time dateTime={nota.fecha_calificacion}>{fechaDeclaracion.format(new Date(nota.fecha_calificacion))}</time>
                </li>)}</ul>}
              {calificacion?.error && <p className="tutorias__error-cierre" role="alert">{calificacion.error.message}</p>}
              {calificacion && !calificacion.enviada && puedeCalificar &&
                <FormularioCalificacionTutoria
                  contraparte={nombre(tutoria.id_tutor === idUsuario ? tutoria.id_tutee : tutoria.id_tutor)}
                  puntuacion={puntuacion} onCambiar={setPuntuacion} onEnviar={calificacion.enviar}
                  enviando={calificacion.enviando} bloqueado={calificacion.error?.comprobarEstado ?? false} />}
            </section>
          </div>
        </>}
  </main>
}
