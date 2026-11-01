import { IlustracionTutoria } from '../components/IlustracionTutoria'

export function PanelComunidad() {
  return (
    <aside className="panel-comunidad" aria-labelledby="comunidad-titulo">
      <p className="panel-comunidad__etiqueta">Comunidad universitaria</p>
      <h2 id="comunidad-titulo">Aprender juntos comienza aquí</h2>
      <p className="panel-comunidad__descripcion">
        Conecta con estudiantes verificados, agenda tutorías y fortalece tus materias desde una sola plataforma.
      </p>
      <IlustracionTutoria className="panel-comunidad__ilustracion" />
      <ul className="panel-comunidad__ventajas">
        <li>Acceso con correo institucional</li>
        <li>Tutores y reputaciones verificables</li>
        <li>Tus solicitudes y horarios en un solo lugar</li>
      </ul>
    </aside>
  )
}
