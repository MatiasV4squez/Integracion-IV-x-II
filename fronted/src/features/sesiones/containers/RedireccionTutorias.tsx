import { Navigate, useLocation, useParams } from 'react-router'
import { destinoTutoriasAnterior } from '../utils/filtros-tutorias'

export default function RedireccionTutorias() {
  const ubicacion = useLocation()
  const { idSesion } = useParams()
  return <Navigate replace to={destinoTutoriasAnterior(idSesion, ubicacion.search, ubicacion.hash)} />
}
