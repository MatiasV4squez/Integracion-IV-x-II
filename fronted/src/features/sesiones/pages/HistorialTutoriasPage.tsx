import { Link } from 'react-router'
import type { Materia } from '../../materias/models/materia'
import { Paginacion } from '../../../shared/components/Paginacion'
import { EstadoConsultaTutorias } from '../components/EstadoConsultaTutorias'
import { TutoriaCard } from '../components/TutoriaCard'
import { ESTADOS_SESION } from '../models/sesion'
import type { ConsultaTutorias, FiltrosTutorias, PaginaTutorias } from '../models/tutoria'
import { ETIQUETAS_SESION, rolesTutoriasDisponibles } from '../utils/filtros-tutorias'
import './Tutorias.css'

interface Propiedades {
  idUsuario: string
  roles: readonly string[]
  consulta: ConsultaTutorias<PaginaTutorias>
  filtros: FiltrosTutorias
  materias: Materia[]
  nombres: ReadonlyMap<string, string>
  busqueda: string
  onFiltrar: (cambios: Partial<FiltrosTutorias>) => void
  onLimpiar: () => void
  onRecargar: () => void
}

export default function HistorialTutoriasPage({ idUsuario, roles, consulta, filtros, materias, nombres, busqueda, onFiltrar, onLimpiar, onRecargar }: Propiedades) {
  const pagina = consulta.estado === 'listo' ? consulta.datos : null
  const puedeElegirParticipacion = rolesTutoriasDisponibles(roles).length > 1
  return <section className="historial-tutorias" aria-labelledby="historial-tutorias-titulo">
    <div className="tutorias__encabezado"><div><h2 id="historial-tutorias-titulo">Historial de tutorías</h2>
      <p className="tutorias__subtitulo">Revisa todas tus sesiones y calificaciones, incluidas las finalizadas.</p></div>
      <button className="boton-global boton-global--secundario" type="button" onClick={onRecargar} disabled={consulta.estado === 'cargando'}>Actualizar</button>
    </div>
    <div className={'tutorias__filtros' + (puedeElegirParticipacion ? '' : ' tutorias__filtros--sin-rol')} role="group" aria-label="Filtros del historial">
      {puedeElegirParticipacion && <label>Participación<select value={filtros.rol} onChange={(evento) => onFiltrar({ rol: evento.target.value as FiltrosTutorias['rol'], page: 1 })}>
        <option value="">Todas mis participaciones</option><option value="ESTUDIANTE">Como estudiante</option><option value="TUTOR">Como tutor</option>
      </select></label>}
      <label>Estado<select value={filtros.estado} onChange={(evento) => onFiltrar({ estado: evento.target.value as FiltrosTutorias['estado'], page: 1 })}>
        <option value="">Todos los estados</option>{ESTADOS_SESION.map((estado) => <option key={estado} value={estado}>{ETIQUETAS_SESION[estado]}</option>)}
      </select></label>
      <label>Por página<select value={filtros.limit} onChange={(evento) => onFiltrar({ limit: Number(evento.target.value), page: 1 })}>
        {[10, 20, 50].map((limite) => <option key={limite} value={limite}>{limite} tutorías</option>)}
      </select></label>
      <button className="boton-global boton-global--secundario" type="button" onClick={onLimpiar}>Limpiar filtros</button>
    </div>
    <section aria-label="Listado de tutorías" aria-busy={consulta.estado === 'cargando'}>
      {consulta.estado === 'cargando' ? <EstadoConsultaTutorias estado="cargando" />
        : consulta.estado === 'error' ? <EstadoConsultaTutorias estado="error" tipo={consulta.tipo} mensaje={consulta.mensaje} onReintentar={onRecargar} />
          : pagina && <>
            <div className="tutorias__resumen" role="status"><strong>{pagina.total} {pagina.total === 1 ? 'tutoría encontrada' : 'tutorías encontradas'}</strong>
              <span>Horarios de Chile continental</span></div>
            {pagina.items.length === 0 ? <><EstadoConsultaTutorias estado="vacio" mensaje={filtros.rol === 'ESTUDIANTE'
              ? 'Aquí aparecerán las tutorías que solicites. También puedes revisar otros estados.'
              : filtros.rol === 'TUTOR' ? 'Aquí aparecerán las sesiones solicitadas por tus estudiantes. También puedes revisar otros estados.' : undefined} />
              <div className="tutorias__enlaces-vacios">{filtros.page > 1 && <button className="boton-global boton-global--secundario" type="button" onClick={() => onFiltrar({ page: 1 })}>Ir a la primera página</button>}
                <Link to={filtros.rol === 'TUTOR' ? '/disponibilidad' : '/tutores'} className="boton-global boton-global--secundario">{filtros.rol === 'TUTOR' ? 'Gestionar disponibilidad' : 'Buscar tutores'}</Link></div></>
              : <div className="tutorias__listado">{pagina.items.map((tutoria) => <TutoriaCard key={tutoria.id_sesion}
                tutoria={tutoria} idUsuario={idUsuario} materia={materias.find((materia) => materia.idMateria === tutoria.id_materia)?.nombre ?? 'Materia #' + tutoria.id_materia}
                nombres={nombres} busqueda={busqueda} mostrarParticipacion={puedeElegirParticipacion} />)}</div>}
            <Paginacion page={pagina.page} totalPages={pagina.totalPages} onCambiarPagina={(page) => onFiltrar({ page })} etiqueta="Páginas de mis tutorías" />
          </>}
    </section>
  </section>
}
