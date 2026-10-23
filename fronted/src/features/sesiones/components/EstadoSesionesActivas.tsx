import { Link } from 'react-router'

interface EstadoSesionesActivasProps {
  estado: 'cargando' | 'vacio' | 'error' | 'sesion' | 'permiso'
  mensaje?: string
  onReintentar?: () => void
}

export function EstadoSesionesActivas({ estado, mensaje, onReintentar }: EstadoSesionesActivasProps) {
  const contenido = {
    cargando: ['Cargando tus sesiones…', 'Estamos consultando las sesiones activas de tus tutorías.'],
    vacio: ['No tienes sesiones activas', 'Aquí aparecerán las tutorías que solicites mientras estén pendientes, confirmadas o por cerrar.'],
    error: ['No pudimos cargar tus sesiones', 'Inténtalo nuevamente en unos momentos.'],
    sesion: ['Inicia sesión para ver tus sesiones', 'Accede con tu cuenta de estudiante para consultar tus sesiones activas.'],
    permiso: ['Esta sección es para estudiantes', 'Necesitas una cuenta de estudiante para consultar tus sesiones activas.'],
  }
  return (
    <div className="sesiones-activas__estado" role={estado === 'error' || estado === 'permiso' ? 'alert' : 'status'}>
      <h3>{contenido[estado][0]}</h3>
      <p>{mensaje ?? contenido[estado][1]}</p>
      {estado === 'sesion' && <Link className="sesiones-activas__boton" to="/login">Iniciar sesión</Link>}
      {estado === 'error' && onReintentar && (
        <button className="sesiones-activas__boton" type="button" onClick={onReintentar}>Reintentar</button>
      )}
    </div>
  )
}
