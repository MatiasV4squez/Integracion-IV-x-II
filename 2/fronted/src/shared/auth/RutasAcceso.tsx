import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { obtenerInicioPorRol } from '../layout/configuracion-navegacion'
import { evaluarAcceso, leerDestinoSolicitado, type RolPlataforma } from './acceso-rutas'
import { useSesionUsuario } from './useSesionUsuario'

interface Propiedades {
  roles?: readonly RolPlataforma[]
  children?: ReactNode
}

// Sin roles basta con tener sesión. Al vencer el token, useSesionUsuario devuelve null y se redirige.
export function RutaProtegida({ roles, children }: Propiedades) {
  const sesion = useSesionUsuario()
  const { pathname, search, hash } = useLocation()
  const acceso = evaluarAcceso(sesion, roles)

  if (acceso === 'sesion') return (
    <>
      <main className="carga-pagina" role="status" aria-live="polite">Redirigiendo al inicio de sesión…</main>
      <Navigate to="/login" replace state={{ desde: pathname + search + hash }} />
    </>
  )
  if (acceso === 'permiso') return (
    <main className="acceso-denegado">
      <section className="acceso-denegado__tarjeta" aria-labelledby="acceso-denegado-titulo">
        <h1 id="acceso-denegado-titulo">No tienes acceso a esta sección</h1>
        <p>Tu cuenta no tiene los permisos necesarios para ver esta página.</p>
        <Link to={obtenerInicioPorRol(sesion?.roles)} className="boton-global boton-global--primario">Ir a mi inicio</Link>
      </section>
    </main>
  )
  return children ?? <Outlet />
}

// Login y registro solo tienen sentido sin sesión; tras iniciarla se continúa hacia el destino pedido.
export function RutaInvitado({ children }: Omit<Propiedades, 'roles'>) {
  const sesion = useSesionUsuario()
  const { state } = useLocation()
  if (sesion) return <Navigate to={leerDestinoSolicitado(state) ?? obtenerInicioPorRol(sesion.roles)} replace />
  return children ?? <Outlet />
}
