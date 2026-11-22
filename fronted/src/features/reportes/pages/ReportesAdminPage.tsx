import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Paginacion } from '../../../shared/components/Paginacion'
import type {
  AccionModeracion,
  ConsultaReportes,
  EstadoReporte,
  FiltrosReportes,
  Reporte,
  ResolucionReporte,
  ResultadoCierre,
} from '../models/reporte'
import { esFechaFiltro } from '../utils/leer-parametros-reportes'
import { MAX_MOTIVO_RESOLUCION } from '../utils/validar-reporte'
import './ReportesAdminPage.css'

interface Propiedades {
  acceso?: 'sesion' | 'permiso'
  consulta: ConsultaReportes
  filtros: FiltrosReportes
  nombres?: ReadonlyMap<string, string>
  accionEnCurso?: { id: number; accion: AccionModeracion } | null
  decisionesBloqueadas?: boolean
  mensajeAccion?: string | null
  errorAccion?: string | null
  onRecargar: () => void
  onFiltrar: (filtros: { estado?: EstadoReporte; fechaDesde?: string; fechaHasta?: string }) => void
  onCambiarPagina: (pagina: number) => void
  onResolver: (reporte: Reporte, estado: ResolucionReporte, motivo?: string) => void
  onReactivar: (reporte: Reporte) => void
}

interface PropiedadesFiltros {
  filtros: FiltrosReportes
  deshabilitado: boolean
  onFiltrar: (filtros: { estado?: EstadoReporte; fechaDesde?: string; fechaHasta?: string }) => void
}

interface PropiedadesTarjeta {
  reporte: Reporte
  nombres: ReadonlyMap<string, string>
  accionEnCurso: AccionModeracion | null
  deshabilitado: boolean
  onResolver: (reporte: Reporte, estado: ResolucionReporte, motivo?: string) => void
  onReactivar: (reporte: Reporte) => void
}

const ETIQUETAS_ESTADO: Record<EstadoReporte, string> = {
  PENDIENTE: 'Pendiente',
  DESESTIMADO: 'Desestimado',
  ADVERTIDO: 'Advertido',
  SUSPENDIDO: 'Suspendido',
}

const CLASES_ESTADO: Record<EstadoReporte, string> = {
  PENDIENTE: 'reporte__estado--pendiente',
  DESESTIMADO: 'reporte__estado--desestimado',
  ADVERTIDO: 'reporte__estado--advertido',
  SUSPENDIDO: 'reporte__estado--suspendido',
}

const ETIQUETAS_RESULTADO: Record<ResultadoCierre, string> = {
  COMPLETADA: 'Completada',
  NO_REALIZADA: 'No realizada',
  INASISTENCIA: 'Inasistencia',
}

function fechaLegible(fecha: string | null) {
  if (!fecha) return 'Sin registrar'
  return new Date(fecha).toLocaleString('es-CL', { timeZone: 'America/Santiago' })
}

function etiquetaUsuario(id: string, nombres: ReadonlyMap<string, string>) {
  return nombres.get(id) ?? `Usuario #${id}`
}

function FiltrosReportesForm({ filtros, deshabilitado, onFiltrar }: PropiedadesFiltros) {
  const [estado, establecerEstado] = useState(filtros.estado ?? '')
  const [fechaDesde, establecerFechaDesde] = useState(filtros.fechaDesde ?? '')
  const [fechaHasta, establecerFechaHasta] = useState(filtros.fechaHasta ?? '')
  const [error, establecerError] = useState<string | undefined>()

  function aplicar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (fechaDesde && !esFechaFiltro(fechaDesde)) {
      establecerError('La fecha desde no es válida. Usa el formato AAAA-MM-DD.')
      return
    }
    if (fechaHasta && !esFechaFiltro(fechaHasta)) {
      establecerError('La fecha hasta no es válida. Usa el formato AAAA-MM-DD.')
      return
    }
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      establecerError('La fecha desde no puede ser posterior a la fecha hasta.')
      return
    }
    establecerError(undefined)
    onFiltrar({
      estado: estado === '' ? undefined : (estado as EstadoReporte),
      fechaDesde: fechaDesde === '' ? undefined : fechaDesde,
      fechaHasta: fechaHasta === '' ? undefined : fechaHasta,
    })
  }

  function limpiar() {
    establecerEstado('')
    establecerFechaDesde('')
    establecerFechaHasta('')
    establecerError(undefined)
    onFiltrar({})
  }

  return (
    <form className="reportes-admin__filtros" onSubmit={aplicar}>
      <div className="reportes-admin__campos-filtros">
        <div className="reportes-admin__campo">
          <label htmlFor="filtro-estado">Estado</label>
          <select
            id="filtro-estado"
            value={estado}
            disabled={deshabilitado}
            onChange={(evento) => establecerEstado(evento.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="DESESTIMADO">Desestimados</option>
            <option value="ADVERTIDO">Advertidos</option>
            <option value="SUSPENDIDO">Suspendidos</option>
          </select>
        </div>

        <div className="reportes-admin__campo">
          <label htmlFor="filtro-fecha-desde">Creados desde</label>
          <input
            id="filtro-fecha-desde"
            type="date"
            value={fechaDesde}
            disabled={deshabilitado}
            onChange={(evento) => establecerFechaDesde(evento.target.value)}
          />
        </div>

        <div className="reportes-admin__campo">
          <label htmlFor="filtro-fecha-hasta">Creados hasta</label>
          <input
            id="filtro-fecha-hasta"
            type="date"
            value={fechaHasta}
            disabled={deshabilitado}
            onChange={(evento) => establecerFechaHasta(evento.target.value)}
          />
        </div>
      </div>

      {error && <p className="reportes-admin__error" role="alert">{error}</p>}

      <div className="reportes-admin__acciones-filtros">
        <button type="submit" className="reportes-admin__aplicar" disabled={deshabilitado}>
          Aplicar filtros
        </button>
        <button type="button" className="reportes-admin__limpiar" disabled={deshabilitado} onClick={limpiar}>
          Limpiar filtros
        </button>
      </div>
    </form>
  )
}

function TarjetaReporte({ reporte, nombres, accionEnCurso, deshabilitado, onResolver, onReactivar }: PropiedadesTarjeta) {
  const [motivo, establecerMotivo] = useState('')
  const [errorMotivo, establecerErrorMotivo] = useState<string | undefined>()
  const [confirmando, establecerConfirmando] = useState<'suspension' | 'reactivacion' | null>(null)

  const procesando = accionEnCurso !== null
  const bloqueado = deshabilitado || procesando

  function resolver(estado: ResolucionReporte) {
    const normalizado = motivo.trim()
    if (motivo !== '' && normalizado === '') {
      establecerErrorMotivo('El motivo no puede contener solo espacios en blanco.')
      return
    }
    if (normalizado.length > MAX_MOTIVO_RESOLUCION) {
      establecerErrorMotivo(`El motivo debe tener como máximo ${MAX_MOTIVO_RESOLUCION} caracteres.`)
      return
    }
    establecerErrorMotivo(undefined)
    onResolver(reporte, estado, normalizado === '' ? undefined : normalizado)
  }

  return (
    <article className="reporte">
      <div className="reporte__cabecera">
        <h3 className="reporte__titulo">Reporte #{reporte.id}: {reporte.titulo}</h3>
        <div className="reporte__etiquetas">
          <span className={`reporte__estado ${CLASES_ESTADO[reporte.estado]}`}>
            {ETIQUETAS_ESTADO[reporte.estado]}
          </span>
          {reporte.reactivadoEn !== null && (
            <span className="reporte__estado reporte__estado--reactivado">Cuenta reactivada</span>
          )}
        </div>
      </div>

      <p className="reporte__descripcion">{reporte.descripcion}</p>

      <dl className="reporte__datos">
        <div>
          <dt>Sesión</dt>
          <dd>#{reporte.idSesion}</dd>
        </div>
        <div>
          <dt>Reportado por</dt>
          <dd>{etiquetaUsuario(reporte.usuarioReportadorId, nombres)}</dd>
        </div>
        <div>
          <dt>Usuario reportado</dt>
          <dd>{etiquetaUsuario(reporte.usuarioReportadoId, nombres)}</dd>
        </div>
        <div>
          <dt>Creado</dt>
          <dd>{fechaLegible(reporte.creadoEn)}</dd>
        </div>
      </dl>

      {reporte.estado !== 'PENDIENTE' && (
        <div className="reporte__resolucion">
          <p>
            <strong>Resolución:</strong> {ETIQUETAS_ESTADO[reporte.estado]}
            {' · '}
            {reporte.resueltoPorId !== null ? etiquetaUsuario(reporte.resueltoPorId, nombres) : 'Sin registrar'}
            {' · '}
            {fechaLegible(reporte.resueltoEn)}
          </p>
          {reporte.motivo !== null && (
            <p className="reporte__motivo"><strong>Motivo:</strong> {reporte.motivo}</p>
          )}
          {reporte.reactivadoEn !== null && (
            <p>
              <strong>Reactivación:</strong>
              {' '}
              {reporte.reactivadoPorId !== null ? etiquetaUsuario(reporte.reactivadoPorId, nombres) : 'Sin registrar'}
              {' · '}
              {fechaLegible(reporte.reactivadoEn)}
            </p>
          )}
        </div>
      )}

      {reporte.estado === 'PENDIENTE' && (
        <section className="reporte__revision" aria-label={`Resolver reporte ${reporte.id}`}>
          <label className="reporte__campo" htmlFor={`motivo-reporte-${reporte.id}`}>
            Motivo de la resolución (opcional, hasta {MAX_MOTIVO_RESOLUCION} caracteres)
            <textarea
              id={`motivo-reporte-${reporte.id}`}
              rows={3}
              maxLength={MAX_MOTIVO_RESOLUCION}
              value={motivo}
              disabled={bloqueado}
              aria-invalid={errorMotivo ? true : undefined}
              aria-describedby={errorMotivo ? `motivo-reporte-${reporte.id}-error` : undefined}
              onChange={(evento) => establecerMotivo(evento.target.value)}
            />
          </label>
          {errorMotivo && (
            <p className="reporte__error" id={`motivo-reporte-${reporte.id}-error`} role="alert">
              {errorMotivo}
            </p>
          )}

          {confirmando === 'suspension' ? (
            <div className="reporte__confirmacion" role="group" aria-label="Confirmar suspensión de cuenta">
              <p>
                ¿Suspender la cuenta de {etiquetaUsuario(reporte.usuarioReportadoId, nombres)}?
                No podrá iniciar sesión hasta que un administrador la reactive.
              </p>
              <div className="reporte__confirmacion-acciones">
                <button
                  type="button"
                  className="reporte__mini-boton reporte__mini-boton--peligro"
                  disabled={bloqueado}
                  onClick={() => resolver('SUSPENDIDO')}
                >
                  Sí, suspender
                </button>
                <button
                  type="button"
                  className="reporte__mini-boton"
                  disabled={procesando}
                  onClick={() => establecerConfirmando(null)}
                >
                  Volver
                </button>
              </div>
            </div>
          ) : (
            <div className="reporte__acciones">
              <button
                type="button"
                className="reporte__boton"
                disabled={bloqueado}
                onClick={() => resolver('DESESTIMADO')}
              >
                Desestimar
              </button>
              <button
                type="button"
                className="reporte__boton"
                disabled={bloqueado}
                onClick={() => resolver('ADVERTIDO')}
              >
                Advertir
              </button>
              <button
                type="button"
                className="reporte__boton reporte__boton--peligro"
                disabled={bloqueado}
                onClick={() => establecerConfirmando('suspension')}
              >
                Suspender cuenta…
              </button>
            </div>
          )}

          {accionEnCurso === 'resolver' && (
            <p className="reporte__procesando" role="status">Procesando resolución…</p>
          )}
        </section>
      )}

      {reporte.estado === 'SUSPENDIDO' && reporte.reactivadoEn === null && (
        <section className="reporte__reactivacion" aria-label={`Reactivar cuenta del reporte ${reporte.id}`}>
          {confirmando === 'reactivacion' ? (
            <div className="reporte__confirmacion" role="group" aria-label="Confirmar reactivación de cuenta">
              <p>
                ¿Reactivar la cuenta de {etiquetaUsuario(reporte.usuarioReportadoId, nombres)}?
                Podrá volver a iniciar sesión.
              </p>
              <div className="reporte__confirmacion-acciones">
                <button
                  type="button"
                  className="reporte__mini-boton"
                  disabled={bloqueado}
                  onClick={() => onReactivar(reporte)}
                >
                  Sí, reactivar
                </button>
                <button
                  type="button"
                  className="reporte__mini-boton"
                  disabled={procesando}
                  onClick={() => establecerConfirmando(null)}
                >
                  Volver
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="reporte__boton"
              disabled={bloqueado}
              onClick={() => establecerConfirmando('reactivacion')}
            >
              Reactivar cuenta…
            </button>
          )}

          {accionEnCurso === 'reactivar' && (
            <p className="reporte__procesando" role="status">Procesando reactivación…</p>
          )}
        </section>
      )}
    </article>
  )
}

export default function ReportesAdminPage({
  acceso, consulta, filtros, nombres = new Map(), accionEnCurso = null,
  decisionesBloqueadas = false, mensajeAccion = null, errorAccion = null,
  onRecargar, onFiltrar, onCambiarPagina, onResolver, onReactivar,
}: Propiedades) {
  if (acceso) return (
    <main className="reportes-admin">
      <h1>Reportes y moderación</h1>
      <p className="reportes-admin__aviso" role="alert">
        {acceso === 'sesion'
          ? 'Debes iniciar sesión con una cuenta de administrador.'
          : 'No tienes permisos para consultar esta sección.'}
      </p>
      <Link className="reportes-admin__enlace" to={acceso === 'sesion' ? '/login' : '/materias'}>
        {acceso === 'sesion' ? 'Iniciar sesión' : 'Ir a materias'}
      </Link>
    </main>
  )

  const reportes = consulta.estado === 'listo' ? consulta.reportes : []
  const conflictos = consulta.estado === 'listo' ? consulta.conflictos : []
  const paginacion = consulta.estado === 'listo' ? consulta.paginacion : null
  const procesando = accionEnCurso !== null
  const deshabilitado = procesando || decisionesBloqueadas

  return (
    <main className="reportes-admin" aria-busy={consulta.estado === 'cargando'}>
      <h1>Reportes y moderación</h1>
      <p className="reportes-admin__subtitulo">
        Revisa los reportes de conducta, resuélvelos y administra las suspensiones de cuentas.
      </p>

      <FiltrosReportesForm
        key={`${filtros.estado ?? ''}|${filtros.fechaDesde ?? ''}|${filtros.fechaHasta ?? ''}`}
        filtros={filtros}
        deshabilitado={procesando}
        onFiltrar={onFiltrar}
      />

      <div className="reportes-admin__actualizacion">
        <button type="button" className="reportes-admin__actualizar" disabled={procesando} onClick={onRecargar}>
          {consulta.estado === 'error' ? 'Reintentar consulta' : 'Actualizar listado'}
        </button>
      </div>

      {mensajeAccion && <p className="reportes-admin__exito" role="status">{mensajeAccion}</p>}
      {errorAccion && <p className="reportes-admin__aviso" role="alert">{errorAccion}</p>}

      {consulta.estado === 'cargando' && (
        <p className="carga-pagina" role="status">Cargando reportes…</p>
      )}
      {consulta.estado === 'error' && (
        <p className="reportes-admin__aviso" role="alert">{consulta.mensaje}</p>
      )}

      {consulta.estado === 'listo' && (
        <>
          <section aria-labelledby="reportes-listado-titulo">
            <div className="reportes-admin__resumen">
              <h2 id="reportes-listado-titulo">Reportes</h2>
              <p className="reportes-admin__cantidad" role="status" aria-atomic="true">
                {paginacion?.total ?? 0} {(paginacion?.total ?? 0) === 1 ? 'reporte' : 'reportes'}
              </p>
            </div>

            {reportes.length === 0 ? (
              <div className="reportes-admin__vacio">
                <h3>No hay reportes que coincidan con los filtros</h3>
                <p>Ajusta los filtros o actualiza el listado para ver los reportes más recientes.</p>
              </div>
            ) : (
              <ul className="reportes-admin__lista">
                {reportes.map((reporte) => (
                  <li key={reporte.id}>
                    <TarjetaReporte
                      reporte={reporte}
                      nombres={nombres}
                      accionEnCurso={accionEnCurso?.id === reporte.id ? accionEnCurso.accion : null}
                      deshabilitado={deshabilitado}
                      onResolver={onResolver}
                      onReactivar={onReactivar}
                    />
                  </li>
                ))}
              </ul>
            )}

            {paginacion && (
              <Paginacion
                page={paginacion.pagina}
                totalPages={paginacion.totalPaginas}
                onCambiarPagina={onCambiarPagina}
                etiqueta="Paginación de reportes"
                deshabilitada={procesando}
              />
            )}
          </section>

          {conflictos.length > 0 && (
            <section className="reportes-admin__conflictos" aria-labelledby="reportes-conflictos-titulo">
              <h2 id="reportes-conflictos-titulo">Conflictos de cierre sin resolver</h2>
              <p className="reportes-admin__descripcion">
                Avisos recibidos de agendamiento-sesiones con declaraciones de cierre en conflicto.
              </p>
              <ul className="reportes-admin__conflictos-lista">
                {conflictos.map((conflicto) => (
                  <li key={conflicto.idAviso} className="conflicto-sesion">
                    <div className="conflicto-sesion__cabecera">
                      <strong>Sesión #{conflicto.idSesion}</strong>
                      <span>{fechaLegible(conflicto.fechaConflicto)}</span>
                    </div>
                    <dl className="conflicto-sesion__datos">
                      <div>
                        <dt>Materia</dt>
                        <dd>#{conflicto.idMateria}</dd>
                      </div>
                      <div>
                        <dt>Tutor</dt>
                        <dd>{etiquetaUsuario(conflicto.idTutor, nombres)}</dd>
                      </div>
                      <div>
                        <dt>Estudiante</dt>
                        <dd>{etiquetaUsuario(conflicto.idTutee, nombres)}</dd>
                      </div>
                    </dl>
                    <ul className="conflicto-sesion__declaraciones">
                      {conflicto.declaraciones.map((declaracion) => (
                        <li key={declaracion.idDeclaracion}>
                          {etiquetaUsuario(declaracion.idUsuario, nombres)}
                          {' declaró «'}
                          {ETIQUETAS_RESULTADO[declaracion.resultadoDeclarado]}
                          {'»'}
                          {declaracion.idUsuarioInasistente !== null && (
                            <>
                              {' · marca inasistente a '}
                              {etiquetaUsuario(declaracion.idUsuarioInasistente, nombres)}
                            </>
                          )}
                          {' · '}
                          {fechaLegible(declaracion.fechaDeclaracion)}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  )
}
