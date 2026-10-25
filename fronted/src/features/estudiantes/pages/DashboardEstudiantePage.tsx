import type { ReactNode } from 'react'
import { Link } from 'react-router'
import './DashboardEstudiantePage.css'

interface Propiedades {
  nombreEstudiante?: string
  proximaClase?: ReactNode
  tutoresRecientes?: ReactNode
  clasesAgendadas?: ReactNode
}

export default function DashboardEstudiantePage({
  nombreEstudiante,
  proximaClase,
  tutoresRecientes,
  clasesAgendadas,
}: Propiedades) {
  return (
    <main className="dashboard-estudiante">
      <section className="dashboard-estudiante__bienvenida" aria-labelledby="dashboard-saludo">
        <div className="dashboard-estudiante__interior dashboard-estudiante__cabecera">
          <div>
            <h1 id="dashboard-saludo">
              Hola{nombreEstudiante?.trim() ? `, ${nombreEstudiante.trim()}` : ''}{' '}
              <span aria-hidden="true">👋</span>
            </h1>
            <p>¿Qué quieres aprender hoy?</p>
          </div>

          <Link to="/tutores" className="dashboard-estudiante__buscador" aria-label="Buscar tutores por materia">
            <span>Busca por materia o tutor</span>
            <span className="dashboard-estudiante__buscar">Buscar</span>
          </Link>
        </div>
      </section>

      <div className="dashboard-estudiante__resumen">
        <div className="dashboard-estudiante__interior dashboard-estudiante__columnas">
          <section aria-labelledby="dashboard-proxima-clase">
            <h2 id="dashboard-proxima-clase">Tu próxima clase</h2>
            <div className="dashboard-estudiante__proxima">
              {proximaClase ?? (
                <div className="dashboard-estudiante__proxima-vacia">
                  <span className="dashboard-estudiante__etiqueta">Tu próximo encuentro</span>
                  <h3>Un espacio para seguir aprendiendo</h3>
                  <p>Tu próxima clase confirmada aparecerá aquí.</p>
                  <Link to="/tutores" className="dashboard-estudiante__enlace-claro">Buscar tutores</Link>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="dashboard-ultimos-tutores">
            <h2 id="dashboard-ultimos-tutores">Últimos tutores</h2>
            <div className="dashboard-estudiante__tutores">
              {tutoresRecientes ?? (
                <div className="dashboard-estudiante__vacio dashboard-estudiante__tutores-vacios">
                  <span className="dashboard-estudiante__avatar" aria-hidden="true">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                    </svg>
                  </span>
                  <h3>Aprende acompañado</h3>
                  <p>Aquí encontrarás los tutores de tus últimas clases.</p>
                  <Link to="/tutores">Explorar tutores <span aria-hidden="true">→</span></Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="dashboard-estudiante__agenda" aria-labelledby="dashboard-clases-agendadas">
        <div className="dashboard-estudiante__interior">
          <div className="dashboard-estudiante__titulo-agenda">
            <h2 id="dashboard-clases-agendadas">Tus clases agendadas</h2>
            <Link to="/solicitudes/nueva">Solicitar tutoría <span aria-hidden="true">→</span></Link>
          </div>
          <div className="dashboard-estudiante__clases">
            {clasesAgendadas ?? (
              <div className="dashboard-estudiante__vacio dashboard-estudiante__clases-vacias">
                <h3>Tu agenda de aprendizaje</h3>
                <p>Aquí verás tus tutorías y el estado de cada solicitud.</p>
                <Link to="/materias">Explorar materias</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
