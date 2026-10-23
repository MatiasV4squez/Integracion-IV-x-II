import type { Materia } from '../../materias/models/materia'
import type { ConsultaSesionesActivas } from '../models/sesion'
import { EstadoSesionesActivas } from './EstadoSesionesActivas'
import { ListadoSesionesActivas } from './ListadoSesionesActivas'
import './SesionesActivas.css'

interface SesionesActivasProps {
  acceso?: 'sesion' | 'permiso'
  consulta: ConsultaSesionesActivas
  materias?: Materia[]
  onRecargar: () => void
}

export function SesionesActivas({ acceso, consulta, materias = [], onRecargar }: SesionesActivasProps) {
  const sesiones = consulta.estado === 'listo' ? consulta.sesiones : []
  return (
    <section className="sesiones-activas" aria-labelledby="sesiones-activas-titulo" aria-busy={!acceso && consulta.estado === 'cargando'}>
      <div className="sesiones-activas__cabecera">
        <h2 id="sesiones-activas-titulo">
          Sesiones activas{!acceso && consulta.estado === 'listo' ? ' (' + sesiones.length + ')' : ''}
        </h2>
        {!acceso && consulta.estado === 'listo' && (
          <button type="button" className="sesiones-activas__boton sesiones-activas__boton--secundario" onClick={onRecargar}>Actualizar</button>
        )}
      </div>
      {acceso ? <EstadoSesionesActivas estado={acceso} />
        : consulta.estado === 'cargando' ? <EstadoSesionesActivas estado="cargando" />
        : consulta.estado === 'error' ? <EstadoSesionesActivas estado={consulta.tipo === 'consulta' ? 'error' : consulta.tipo} mensaje={consulta.mensaje} onReintentar={onRecargar} />
        : sesiones.length === 0 ? <EstadoSesionesActivas estado="vacio" />
        : <ListadoSesionesActivas sesiones={sesiones} materias={materias} />}
    </section>
  )
}
