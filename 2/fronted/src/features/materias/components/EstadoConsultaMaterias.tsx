import './EstadoConsultaMaterias.css'

type EstadoConsultaMateriasProps =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string; onReintentar?: () => void }

export function EstadoConsultaMaterias(props: EstadoConsultaMateriasProps) {
  if (props.estado === 'cargando') {
    return (
      <section className="estado-consulta-materias" role="status" aria-live="polite">
        <h2>Cargando materias…</h2>
        <p>Estamos consultando las asignaturas disponibles.</p>
      </section>
    )
  }

  return (
    <section className="estado-consulta-materias" role="alert">
      <h2>No pudimos cargar el catálogo</h2>
      <p>{props.mensaje}</p>
      {props.onReintentar && (
        <button type="button" onClick={props.onReintentar}>Reintentar</button>
      )}
    </section>
  )
}
