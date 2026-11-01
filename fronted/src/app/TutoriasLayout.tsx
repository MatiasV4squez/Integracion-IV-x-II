import { Suspense } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { inicioSesionHttp } from '../features/inicio-sesion/services/inicio-sesion-http'
import { Encabezado } from '../shared/layout/Encabezado'
import { PiePagina } from '../shared/layout/PiePagina'
import { obtenerNavegacion, obtenerUsuarioEncabezado } from '../shared/layout/configuracion-navegacion'
import { useSesionUsuario } from '../shared/auth/useSesionUsuario'
import { cerrarSesionUsuario } from '../shared/auth/usuario-autenticado'
import { ErrorBoundary } from '../shared/components/ErrorBoundary'
import './TutoriasLayout.css'

export function TutoriasLayout() {
  const sesion = useSesionUsuario()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  function cerrarSesion() {
    // La revocación es de mejor esfuerzo: la sesión local se retira aunque Auth no responda.
    if (sesion) inicioSesionHttp.cerrarSesion(sesion.token, new AbortController().signal).catch(() => {})
    // Navegar antes de retirar la sesión evita que la ruta protegida guarde su dirección como destino.
    navegar('/login', { replace: true })
    cerrarSesionUsuario()
  }

  return (
    <div className="tutorias-layout">
      <a className="saltar-contenido" href="#contenido-principal">Saltar al contenido</a>
      <Encabezado enlaces={obtenerNavegacion(sesion?.roles)} usuario={obtenerUsuarioEncabezado(sesion)} alCerrarSesion={cerrarSesion} />
      <div id="contenido-principal" className="tutorias-layout__contenido" tabIndex={-1}>
        {/* El key reinicia el límite al cambiar de ruta para que el error no persista al navegar. */}
        <ErrorBoundary key={ubicacion.pathname}>
          <Suspense fallback={<main className="carga-pagina" role="status" aria-live="polite" aria-busy="true">Cargando página…</main>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
      <PiePagina />
    </div>
  )
}
