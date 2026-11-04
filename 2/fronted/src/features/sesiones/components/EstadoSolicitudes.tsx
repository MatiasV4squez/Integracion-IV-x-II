import { Link } from 'react-router'

interface EstadoSolicitudesProps {
  estado: 'cargando' | 'vacio' | 'error' | 'sesion' | 'permiso'
  mensaje?: string
  onReintentar?: () => void
}

export function EstadoSolicitudes({ estado, mensaje, onReintentar }: EstadoSolicitudesProps) {
  const contenido = {
    cargando: ['Cargando solicitudes…', 'Estamos consultando las solicitudes que has recibido.'],
    vacio: ['No tienes solicitudes pendientes', 'Aquí aparecerán las solicitudes que recibas como tutor.'],
    error: ['No pudimos cargar las solicitudes', 'Inténtalo nuevamente en unos momentos.'],
    sesion: ['Inicia sesión para ver tus solicitudes', 'Accede con tu cuenta de tutor para consultar las solicitudes recibidas.'],
    permiso: ['Esta sección es para tutores', 'Necesitas estar habilitado como tutor para consultar solicitudes recibidas.'],
  }
  return (
    <div className="solicitudes-recibidas__estado" role={estado === 'error' || estado === 'permiso' ? 'alert' : 'status'}>
      <h3>{contenido[estado][0]}</h3>
      <p>{mensaje ?? contenido[estado][1]}</p>
      {estado === 'sesion' && <Link className="solicitudes-recibidas__boton" to="/login">Iniciar sesión</Link>}
      {estado === 'error' && onReintentar && (
        <button className="solicitudes-recibidas__boton" type="button" onClick={onReintentar}>Reintentar</button>
      )}
    </div>
  )
}
