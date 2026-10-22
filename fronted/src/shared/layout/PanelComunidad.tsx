export function PanelComunidad() {
  return (
    <aside className="panel-comunidad" aria-labelledby="comunidad-titulo">
      <p className="panel-comunidad__etiqueta">Comunidad universitaria</p>
      <h2 id="comunidad-titulo">Aprender juntos comienza aquí</h2>
      <p className="panel-comunidad__descripcion">
        Conecta con estudiantes verificados, agenda tutorías y fortalece tus materias desde una sola plataforma.
      </p>
      <svg className="panel-comunidad__ilustracion" viewBox="0 0 430 260" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="comunidad-fondo" x1="0" y1="130" x2="430" y2="130" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1678f5" /><stop offset="1" stopColor="#68b4ff" />
          </linearGradient>
        </defs>
        <rect width="430" height="260" rx="24" fill="url(#comunidad-fondo)" />
        <circle cx="310" cy="130" r="105" fill="#fff" fillOpacity=".18" />
        <circle cx="122" cy="94" r="46" fill="#ff9f12" />
        <circle cx="301" cy="111" r="46" fill="#fff" />
        <rect x="72" y="186" width="290" height="28" rx="13" fill="#1453aa" />
        <rect x="166" y="142" width="100" height="54" rx="9" fill="#fff" />
      </svg>
      <ul className="panel-comunidad__ventajas">
        <li>Acceso con correo institucional</li>
        <li>Tutores y reputaciones verificables</li>
        <li>Tus solicitudes y horarios en un solo lugar</li>
      </ul>
    </aside>
  )
}
