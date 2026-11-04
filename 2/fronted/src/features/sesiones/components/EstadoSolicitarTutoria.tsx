import { Link } from 'react-router'
import '../pages/SolicitarTutoriaPage.css'

interface EstadoSolicitarTutoriaProps {
  estado: 'sesion' | 'permiso' | 'materia'
}

export function EstadoSolicitarTutoria({ estado }: EstadoSolicitarTutoriaProps) {
  const contenido = {
    sesion: ['Inicia sesión para solicitar una tutoría', 'Accede con tu cuenta de estudiante para elegir un tutor y un horario disponibles.'],
    permiso: ['Esta sección es para estudiantes', 'Necesitas una cuenta de estudiante para solicitar una tutoría.'],
    materia: ['Selecciona una materia', 'Elige la materia de la tutoría desde el catálogo o desde la búsqueda de tutores para ver sus horarios disponibles.'],
  }
  return (
    <main className="seleccion-tutoria">
      <section className="seleccion-tutoria__tarjeta seleccion-tutoria__estado" role={estado === 'permiso' ? 'alert' : 'status'}>
        <h1>{contenido[estado][0]}</h1>
        <p>{contenido[estado][1]}</p>
        <div className="seleccion-tutoria__acciones">
          {estado === 'sesion' && <Link className="seleccion-tutoria__boton" to="/login">Iniciar sesión</Link>}
          {estado === 'permiso' && <Link className="seleccion-tutoria__boton" to="/">Volver al inicio</Link>}
          {estado === 'materia' && <>
            <Link className="seleccion-tutoria__boton" to="/materias">Ver materias</Link>
            <Link className="seleccion-tutoria__boton" to="/tutores">Buscar tutores</Link>
          </>}
        </div>
      </section>
    </main>
  )
}
