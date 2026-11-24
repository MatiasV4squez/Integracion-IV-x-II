import { Link } from 'react-router'
import type { ConsultaTutoresRevision } from '../models/tutores-revision'
import './TutoresRevisionAdminPage.css'

interface Propiedades {
  acceso?: 'sesion' | 'permiso'
  consulta: ConsultaTutoresRevision
  nombres?: ReadonlyMap<string, string>
  onRecargar: () => void
}

const formatoPromedio = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

function etiquetaUsuario(id: string, nombres: ReadonlyMap<string, string>) {
  return nombres.get(id) ?? `Usuario #${id}`
}

export default function TutoresRevisionAdminPage({ acceso, consulta, nombres = new Map(), onRecargar }: Propiedades) {
  if (acceso) return (
    <main className="tutores-revision">
      <h1>Tutores en revisión</h1>
      <p className="tutores-revision__aviso" role="alert">
        {acceso === 'sesion'
          ? 'Debes iniciar sesión con una cuenta de administrador.'
          : 'No tienes permisos para consultar esta sección.'}
      </p>
      <Link className="tutores-revision__enlace" to={acceso === 'sesion' ? '/login' : '/materias'}>
        {acceso === 'sesion' ? 'Iniciar sesión' : 'Ir a materias'}
      </Link>
    </main>
  )

  const tutores = consulta.estado === 'listo' ? consulta.tutores : []

  return (
    <main className="tutores-revision" aria-busy={consulta.estado === 'cargando'}>
      <h1>Tutores en revisión</h1>
      <p className="tutores-revision__subtitulo">
        Tutores cuya reputación quedó marcada para revisión administrativa.
      </p>

      <div className="tutores-revision__actualizacion">
        <button type="button" className="tutores-revision__actualizar" disabled={consulta.estado === 'cargando'} onClick={onRecargar}>
          {consulta.estado === 'error' ? 'Reintentar consulta' : 'Actualizar listado'}
        </button>
      </div>

      {consulta.estado === 'cargando' && (
        <p className="carga-pagina" role="status">Cargando tutores en revisión…</p>
      )}
      {consulta.estado === 'error' && (
        <p className="tutores-revision__aviso" role="alert">{consulta.mensaje}</p>
      )}

      {consulta.estado === 'listo' && (
        <section aria-labelledby="tutores-revision-titulo">
          <div className="tutores-revision__resumen">
            <h2 id="tutores-revision-titulo">Tutores marcados en revisión</h2>
            <p className="tutores-revision__cantidad" role="status" aria-atomic="true">
              {tutores.length} {tutores.length === 1 ? 'tutor' : 'tutores'}
            </p>
          </div>

          {tutores.length === 0 ? (
            <div className="tutores-revision__vacio">
              <h3>No hay tutores en revisión</h3>
              <p>Los tutores marcados como EN_REVISION aparecerán aquí.</p>
            </div>
          ) : (
            <ul className="tutores-revision__lista">
              {tutores.map((tutor) => (
                <li key={tutor.idTutor} className="tutor-revision">
                  <div className="tutor-revision__cabecera">
                    <h3 className="tutor-revision__nombre">{etiquetaUsuario(tutor.idTutor, nombres)}</h3>
                    <span className="tutor-revision__estado">En revisión</span>
                  </div>
                  <dl className="tutor-revision__datos">
                    <div>
                      <dt>Promedio</dt>
                      <dd>{tutor.promedio === null ? 'Sin calificaciones' : `${formatoPromedio.format(tutor.promedio)} de 5`}</dd>
                    </div>
                    <div>
                      <dt>Calificaciones</dt>
                      <dd>{tutor.cantidadCalificaciones}</dd>
                    </div>
                  </dl>
                  <Link className="tutor-revision__perfil" to={`/tutores/${tutor.idTutor}`}>
                    Ver perfil del tutor
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
