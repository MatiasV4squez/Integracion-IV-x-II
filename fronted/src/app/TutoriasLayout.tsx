import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { Encabezado } from '../shared/layout/Encabezado'
import { PiePagina } from '../shared/layout/PiePagina'
import { obtenerNavegacion, obtenerUsuarioEncabezado } from '../shared/layout/configuracion-navegacion'
import { useSesionUsuario } from '../shared/auth/useSesionUsuario'
import './TutoriasLayout.css'

export function TutoriasLayout() {
  const sesion = useSesionUsuario()
  return (
    <div className="tutorias-layout">
      <a className="saltar-contenido" href="#contenido-principal">Saltar al contenido</a>
      <Encabezado enlaces={obtenerNavegacion(sesion?.roles)} usuario={obtenerUsuarioEncabezado(sesion)} />
      <div id="contenido-principal" className="tutorias-layout__contenido" tabIndex={-1}>
        <Suspense fallback={<main className="carga-pagina" role="status" aria-live="polite" aria-busy="true">Cargando página…</main>}>
          <Outlet />
        </Suspense>
      </div>
      <PiePagina />
    </div>
  )
}
