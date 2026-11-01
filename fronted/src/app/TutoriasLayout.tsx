import { Suspense, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { inicioSesionHttp } from '../features/inicio-sesion/services/inicio-sesion-http'
import { Encabezado } from '../shared/layout/Encabezado'
import { PiePagina } from '../shared/layout/PiePagina'
import { obtenerNavegacion, obtenerUsuarioEncabezado } from '../shared/layout/configuracion-navegacion'
import { useSesionUsuario } from '../shared/auth/useSesionUsuario'
import { cerrarSesionUsuario } from '../shared/auth/usuario-autenticado'
import { ErrorBoundary } from '../shared/components/ErrorBoundary'
import { SelectorRol, type RolVista } from '../shared/layout/SelectorRol'
import { tieneRol } from '../shared/auth/acceso-rutas'
import './TutoriasLayout.css'

export function TutoriasLayout() {
  const sesion = useSesionUsuario()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [seleccionRol, establecerSeleccionRol] = useState<{
    idUsuario: string
    rol: RolVista
  } | null>(null)

  const rolesSesion = sesion?.roles ?? []
  const puedeAlternar =
    tieneRol(rolesSesion, 'ESTUDIANTE') &&
    tieneRol(rolesSesion, 'TUTOR') &&
    !tieneRol(rolesSesion, 'ADMINISTRADOR')
  const rutaEstudiante = ['/inicio', '/panel', '/solicitudes/nueva'].includes(ubicacion.pathname)
  const rolInicial: RolVista = rutaEstudiante ? 'ESTUDIANTE' : 'TUTOR'
  const rolActivo = seleccionRol && seleccionRol.idUsuario === sesion?.idUsuario
    ? seleccionRol.rol
    : rolInicial
  const rolesVista = puedeAlternar ? [rolActivo] : rolesSesion
  const usuarioEncabezado = obtenerUsuarioEncabezado(
    sesion ? { ...sesion, roles: rolesVista } : null,
  )

  function cambiarRol(nuevoRol: RolVista) {
    if (!sesion || !puedeAlternar) return

    establecerSeleccionRol({
      idUsuario: sesion.idUsuario,
      rol: nuevoRol,
    })
    navegar(nuevoRol === 'ESTUDIANTE' ? '/inicio' : '/tutor')
  }

  function cerrarSesion() {
    // La revocación es de mejor esfuerzo: la sesión local se retira aunque Auth no responda.
    if (sesion) inicioSesionHttp.cerrarSesion(sesion.token, new AbortController().signal).catch(() => {})
    // Navegar antes de retirar la sesión evita que la ruta protegida guarde su dirección como destino.
    navegar('/login', { replace: true })
    establecerSeleccionRol(null)
    cerrarSesionUsuario()
  }

  return (
    <div className="tutorias-layout">
      <a className="saltar-contenido" href="#contenido-principal">Saltar al contenido</a>
      <Encabezado
        enlaces={obtenerNavegacion(rolesVista)}
        usuario={usuarioEncabezado}
        alCerrarSesion={cerrarSesion}
        selectorRol={
          puedeAlternar ? (
            <SelectorRol rolActivo={rolActivo} alCambiar={cambiarRol} />
          ) : null
        }
      />
      <div id="contenido-principal" className="tutorias-layout__contenido" tabIndex={-1}>
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
