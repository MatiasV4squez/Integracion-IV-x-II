import { Navigate, Link } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import DashboardEstudiantePage from '../pages/DashboardEstudiantePage'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { useMaterias } from '../../materias/hooks/useMaterias'
import { useSesionesActivas } from '../../sesiones/hooks/useSesionesActivas'
import { useConsultaSesiones } from '../../sesiones/hooks/useConsultaSesiones'
import { consultarHistorialEstudiante } from '../../sesiones/services/sesiones-api'
import { SesionesActivas } from '../../sesiones/components/SesionesActivas'
import { formatearHorarioSesion } from '../../sesiones/utils/solicitudes-recibidas'
import { useState } from 'react'

function DashboardConSesiones({ sesion }: { sesion: SesionUsuario}){
  const { consulta, recargar } = useSesionesActivas(sesion)
  const { consulta: consultaHistorial, recargar: recargarHistorial } = useConsultaSesiones(sesion, consultarHistorialEstudiante)
  const historial = consultaHistorial.estado === 'listo' ? consultaHistorial.sesiones : []
  const { consulta: catalogo } = useMaterias()
  const [ahora, establecerAhora] = useState(Date.now)
  const materias = catalogo.estado === 'listo'
    ? catalogo.materias
    : []

  const proximaClase = consulta.estado === 'listo'
    ? consulta.sesiones.find(
      (clase) => clase.estado_sesion === 'CONFIRMADA' && Date.parse(clase.inicio) > ahora,)
    : undefined

  const materia = materias.find(
    (elemento) => elemento.idMateria === proximaClase?.id_materia,
  )

  const tutoresRecientes = historial
    .filter((clase) => clase.estado_sesion === 'COMPLETADA')
    .sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio))
    .filter(
      (clase, indice, clases) =>
        clases.findIndex(
          (elemento) => elemento.id_tutor === clase.id_tutor,
        ) === indice,
    )
    .slice(0, 3)

  let contenidoProximaClase = (
    <p role="status">Cargando tu próxima clase…</p>
  )

  if (consulta.estado === 'error') {
    contenidoProximaClase = (
      <p role="alert">{consulta.mensaje}</p>
    )
  } else if (consulta.estado === 'listo') {
    contenidoProximaClase = proximaClase ? (
      <div className="dashboard-estudiante__proxima-vacia">
        <span className="dashboard-estudiante__etiqueta">
          Confirmada
        </span>

        <h3>
          {materia?.nombre ?? `Materia #${proximaClase.id_materia}`}
        </h3>

        <p>Con el tutor #{proximaClase.id_tutor}</p>

        <p>
          <time dateTime={proximaClase.inicio}>
            {formatearHorarioSesion(
              proximaClase.inicio,
              proximaClase.fin,
            )}
          </time>
        </p>
      </div>
    ) : (
      <p>No tienes próximas clases confirmadas.</p>
    )
  }
  function actualizarSesiones() {
    establecerAhora(Date.now())
    recargar()
    recargarHistorial()
  }
  return (
    <DashboardEstudiantePage
      nombreEstudiante={sesion.nombre}
      proximaClase={contenidoProximaClase}
      tutoresRecientes={
        consultaHistorial.estado === 'cargando' ? (
          <p
            className="dashboard-estudiante__tutores-vacios"
            role="status"
          >
            Cargando tus últimos tutores…
          </p>
        ) : consultaHistorial.estado === 'error' ? (
          <p
            className="dashboard-estudiante__tutores-vacios"
            role="alert"
          >
            {consultaHistorial.mensaje}
          </p>
        ) : tutoresRecientes.length === 0 ? (
          <div className="dashboard-estudiante__vacio dashboard-estudiante__tutores-vacios">
            <p>Aún no tienes tutorías completadas.</p>
          </div>
        ) : (
          tutoresRecientes.map((clase) => (
            <article
              key={clase.id_tutor}
              className="dashboard-estudiante__vacio"
            >
              <h3>Tutor #{clase.id_tutor}</h3>
              <p>
                {materias.find(
                  (elemento) => elemento.idMateria === clase.id_materia,
                )?.nombre ?? `Materia #${clase.id_materia}`}
              </p>
              <p>
                {formatearHorarioSesion(clase.inicio, clase.fin)}
              </p>
            </article>
          ))
        )
      }
      clasesAgendadas={
        <SesionesActivas
          consulta={consulta}
          materias={materias}
          onRecargar={actualizarSesiones}
        />
      }
    />
  )
}


export default function DashboardEstudianteContainer() {
  const sesion = useSesionUsuario()

  if (!sesion) {
    return <Navigate to="/login" replace />
  }

  if (!sesion.roles.includes('ESTUDIANTE')) {
    return (
      <main className="dashboard-estudiante">
        <section className="dashboard-estudiante__interior dashboard-estudiante__resumen">
          <h1>Panel del estudiante</h1>
          <p role="alert">
            Esta sección está disponible para estudiantes.
          </p>
          <Link to="/tutores">Ir a buscar tutores</Link>
        </section>
      </main>
    )
  }

  return <DashboardConSesiones
    key={sesion.idUsuario}
    sesion={sesion}
  />
}
