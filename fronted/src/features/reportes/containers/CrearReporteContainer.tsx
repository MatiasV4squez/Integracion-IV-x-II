import { Link, useSearchParams } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import { FormularioReporte } from '../components/FormularioReporte'
import './CrearReporte.css'

export default function CrearReporteContainer() {
  const sesion = useSesionUsuario()
  const [parametros] = useSearchParams()

  const idSesion = parametros.get('sesionId')
  const idUsuarioReportado = parametros.get('usuarioReportadoId')

  if (!sesion) return null

  if (!esIdentificador(idSesion) || !esIdentificador(idUsuarioReportado) || idUsuarioReportado === sesion.idUsuario
  ) {
    return (
      <main className="crear-reporte">
        <h1>Crear reporte</h1>
        <section className="crear-reporte__tarjeta">
          <p role="alert">El enlace no contiene una sesión y una contraparte válidas.</p>
          <Link to="/materias" className="boton-global boton-global--secundario">Volver a materias</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="crear-reporte">
      <h1>Crear reporte</h1>
      <FormularioReporte
        key={`${sesion.idUsuario}:${idSesion}:${idUsuarioReportado}`}
        token={sesion.token}
        idSesion={idSesion}
        idUsuarioReportado={idUsuarioReportado}
      />
    </main>
  )
}
