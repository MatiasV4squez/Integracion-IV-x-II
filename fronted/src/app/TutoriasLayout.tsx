import { Suspense } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { inicioSesionHttp } from '../features/inicio-sesion/services/inicio-sesion-http'
import { Encabezado } from '../shared/layout/Encabezado'
import { PiePagina } from '../shared/layout/PiePagina'
import { obtenerNavegacion, obtenerUsuarioEncabezado } from '../shared/layout/configuracion-navegacion'
import { useSesionUsuario } from '../shared/auth/useSesionUsuario'
import { cerrarSesionUsuario } from '../shared/auth/usuario-autenticado'
import './TutoriasLayout.css'

export function TutoriasLayout() {
  const sesion = useSesionUsuario()
  const navegar = useNavigate()

  function cerrarSesion() {
    // La revocación es de mejor esfuerzo: la sesión local se retira aunque Auth no responda.
    if (sesion) inicioSesionHttp.cerrarSesion(sesion.token, new AbortController().signal).catch(() => {})
    cerrarSesionUsuario()
    navegar('/login', { replace: true })
  }

  return (
    <div className="tutorias-layout">
      <a className="saltar-contenido" href="#contenido-principal">Saltar al contenido</a>
      <Encabezado enlaces={obtenerNavegacion(sesion?.roles)} usuario={obtenerUsuarioEncabezado(sesion)} alCerrarSesion={cerrarSesion} />
      <div id="contenido-principal" className="tutorias-layout__contenido" tabIndex={-1}>
        <Suspense fallback={<main className="carga-pagina" role="status" aria-live="polite" aria-busy="true">Cargando página…</main>}>
          <Outlet />
        </Suspense>
      </div>
      <PiePagina />
    </div>
  )
}
