import { useState } from 'react'
import { Paginacion } from '../../../shared/components/Paginacion'
import type { Materia } from '../../materias/models/materia'
import { EstadoSolicitudes } from '../components/EstadoSolicitudes'
import { ListadoSolicitudes } from '../components/ListadoSolicitudes'
import { AccionAceptarSolicitud } from '../components/AccionAceptarSolicitud'
import { ResultadoAceptacionSolicitud } from '../components/ResultadoAceptacionSolicitud'
import type { AceptacionSolicitud } from '../models/bandeja-solicitudes'
import type { ConsultaSolicitudes } from '../models/sesion'
import './SolicitudesRecibidasPage.css'

interface SolicitudesRecibidasPageProps {
  acceso?: 'sesion' | 'permiso'
  consulta: ConsultaSolicitudes
  materias?: Materia[]
  ahora: number
  onRecargar: () => void
  onAceptar?: (idSesion: string) => void
  aceptacion?: AceptacionSolicitud
  bloqueada?: boolean
  actualizando?: boolean
  errorActualizacion?: string
}

const POR_PAGINA = 10

export default function SolicitudesRecibidasPage({ acceso, consulta, materias = [], ahora, onRecargar,
  onAceptar, aceptacion = { estado: 'inicial' }, bloqueada = false, actualizando = false, errorActualizacion,
}: SolicitudesRecibidasPageProps) {
  const [pagina, setPagina] = useState(1)
  const solicitudes = consulta.estado === 'listo' ? consulta.solicitudes : []
  const totalPaginas = Math.max(1, Math.ceil(solicitudes.length / POR_PAGINA))
  if (consulta.estado === 'listo' && pagina > totalPaginas) setPagina(totalPaginas)
  const paginaVisible = Math.min(pagina, totalPaginas)
  const listo = !acceso && consulta.estado === 'listo'

  return (
    <main className="solicitudes-recibidas" aria-labelledby="solicitudes-titulo">
      <h1 id="solicitudes-titulo">Mis tutorías</h1>
      <p className="solicitudes-recibidas__subtitulo">Revisa las solicitudes antes de que expire su plazo de respuesta.</p>
      {!acceso && <p className="solicitudes-recibidas__contexto">Actuando como Tutor</p>}
      <nav className="solicitudes-recibidas__pestanas" aria-label="Secciones de mis tutorías">
        <span aria-current="page">Solicitudes recibidas{listo ? ' (' + solicitudes.length + ')' : ''}</span>
        <button type="button" disabled title="Esta sección estará disponible próximamente.">Próximas</button>
        <button type="button" disabled title="Esta sección estará disponible próximamente.">Historial</button>
      </nav>

      {listo && (
        <div className="solicitudes-recibidas__resumen" role="status">
          <strong>{solicitudes.length} {solicitudes.length === 1 ? 'solicitud por responder' : 'solicitudes por responder'}</strong>
          <p>El plazo de cada solicitud es de 24 horas desde su envío. Los horarios se muestran en hora de Chile continental.</p>
        </div>
      )}

      {!acceso && <ResultadoAceptacionSolicitud aceptacion={aceptacion} />}
      {!acceso && errorActualizacion && <div className="solicitudes-recibidas__aviso solicitudes-recibidas__aviso--error" role="alert">
        <p>{errorActualizacion} Se muestran los últimos datos confirmados. Pulsa Actualizar para consultar nuevamente.</p>
      </div>}
      {!acceso && actualizando && consulta.estado === 'listo' && <p role="status">Actualizando solicitudes…</p>}

      <section className="solicitudes-recibidas__panel" aria-labelledby="solicitudes-listado-titulo" aria-busy={!acceso && (consulta.estado === 'cargando' || actualizando)}>
        <div className="solicitudes-recibidas__cabecera">
          <h2 id="solicitudes-listado-titulo">Solicitudes recibidas</h2>
          {!acceso && consulta.estado === 'listo' && (
            <button type="button" className="solicitudes-recibidas__boton solicitudes-recibidas__boton--secundario"
              disabled={actualizando || aceptacion.estado === 'aceptando' || (aceptacion.estado === 'error' && ['sesion', 'permiso'].includes(aceptacion.tipo))}
              onClick={onRecargar}>Actualizar</button>
          )}
        </div>
        {acceso ? <EstadoSolicitudes estado={acceso} />
          : consulta.estado === 'cargando' ? <EstadoSolicitudes estado="cargando" />
          : consulta.estado === 'error' ? <EstadoSolicitudes estado={consulta.tipo === 'consulta' ? 'error' : consulta.tipo} mensaje={consulta.mensaje} onReintentar={onRecargar} />
          : solicitudes.length === 0 ? <EstadoSolicitudes estado="vacio" />
          : <>
            <ListadoSolicitudes solicitudes={solicitudes.slice((paginaVisible - 1) * POR_PAGINA, paginaVisible * POR_PAGINA)} materias={materias} ahora={ahora}
              renderizarAcciones={onAceptar ? (solicitud) => <AccionAceptarSolicitud solicitud={solicitud} aceptacion={aceptacion} bloqueada={bloqueada} onAceptar={onAceptar} /> : undefined} />
            <Paginacion page={paginaVisible} totalPages={totalPaginas} onCambiarPagina={setPagina} etiqueta="Páginas de solicitudes"
              deshabilitada={actualizando || aceptacion.estado === 'aceptando'} />
          </>}
      </section>
    </main>
  )
}
