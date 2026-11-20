import { Link, useLocation } from 'react-router'
import { cerrarSesionUsuario } from '../../../shared/auth/usuario-autenticado'

interface Propiedades {
  estado: 'cargando' | 'error' | 'vacio'
  tipo?: 'sesion' | 'permiso' | 'ausente' | 'consulta'
  mensaje?: string
  onReintentar?: () => void
}

export function EstadoConsultaTutorias({ estado, tipo, mensaje, onReintentar }: Propiedades) {
  const ubicacion = useLocation()
  const titulo = estado === 'cargando' ? 'Cargando tus tutorías…'
    : estado === 'vacio' ? 'No hay tutorías para esta selección'
      : tipo === 'ausente' ? 'Tutoría no encontrada' : tipo === 'permiso' ? 'No tienes acceso a esta tutoría'
        : tipo === 'sesion' ? 'Necesitas iniciar sesión nuevamente' : 'No pudimos cargar tus tutorías'
  return <div className="tutorias__estado-consulta" role={estado === 'error' ? 'alert' : 'status'} aria-busy={estado === 'cargando'}>
    <h2>{titulo}</h2>
    <p>{mensaje ?? (estado === 'vacio' ? 'Prueba con otro estado o participación para consultar tu actividad.' : 'Estamos consultando la información de tus sesiones.')}</p>
    {estado === 'error' && tipo === 'sesion'
      ? <Link className="boton-global boton-global--primario" to="/login" onClick={cerrarSesionUsuario}
        state={{ desde: ubicacion.pathname + ubicacion.search }}>Iniciar sesión</Link>
      : estado === 'error' && tipo === 'consulta' && onReintentar
        ? <button className="boton-global boton-global--primario" type="button" onClick={onReintentar}>Reintentar</button> : null}
  </div>
}
