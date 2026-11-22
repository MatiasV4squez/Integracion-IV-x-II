import { Link, useSearchParams } from 'react-router'
import { useSesionUsuario } from '../../../shared/auth/useSesionUsuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import { FormularioReporte } from '../components/FormularioReporte'

export default function CrearReporteContainer() {
  const sesion = useSesionUsuario()
  const [parametros] = useSearchParams()

  const idSesion = parametros.get('sesionId')
  const idUsuarioReportado = parametros.get('usuarioReportadoId')

  if (!sesion) return null

  if (!esIdentificador(idSesion) || !esIdentificador(idUsuarioReportado) || idUsuarioReportado === sesion.idUsuario
  ) {
    return (
      <main>
        <h1>Crear reporte</h1>
        <p role="alert">
          El enlace no contiene una sesión y una contraparte válidas.
        </p>
        <Link to="/materias">Volver a materias</Link>
      </main>
    )
  }

  return (
    <main>
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