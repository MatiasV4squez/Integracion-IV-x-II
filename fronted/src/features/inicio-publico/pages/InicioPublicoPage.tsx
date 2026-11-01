import { Icon, type IconName } from '../../../components/Icon'
import { Link } from 'react-router'
import { IlustracionTutoria } from '../../../shared/components/IlustracionTutoria'
import './InicioPublicoPage.css'

const VENTAJAS: readonly { titulo: string; descripcion: string; icono: IconName }[] = [
  { titulo: 'Horarios flexibles', descripcion: 'Reserva sesiones según tu disponibilidad.', icono: 'clock' },
  { titulo: 'Tutores verificados', descripcion: 'Perfiles validados y reputación visible.', icono: 'check' },
  { titulo: 'Aprendizaje personalizado', descripcion: 'Avanza a tu ritmo con apoyo entre pares.', icono: 'arrow-right' },
]

const PASOS = [
  { titulo: 'Encuentra', descripcion: 'Elige una materia y consulta los tutores y sus horarios.' },
  { titulo: 'Reserva', descripcion: 'Solicita un bloque disponible en pocos pasos.' },
  { titulo: 'Aprende', descripcion: 'Asiste, completa la sesión y deja tu evaluación.' },
]

export default function InicioPublicoPage() {
  return (
    <main className="inicio-publico" aria-labelledby="inicio-publico-titulo">
      <section className="inicio-publico__presentacion" aria-labelledby="inicio-publico-titulo">
        <div className="inicio-publico__interior inicio-publico__portada">
          <div className="inicio-publico__mensaje">
            <p className="inicio-publico__etiqueta">Apoyo académico entre estudiantes</p>
            <h1 id="inicio-publico-titulo">Encuentra al tutor perfecto para ti</h1>
            <p className="inicio-publico__descripcion">Aprende cualquier materia a tu propio ritmo, con horarios flexibles y tutores verificados.</p>
            <div className="inicio-publico__acciones">
              <Link to="/login" className="boton-global boton-global--primario">Iniciar sesión</Link>
              <Link to="/registro" className="boton-global boton-global--secundario">Crear cuenta</Link>
            </div>
          </div>
          <IlustracionTutoria className="inicio-publico__ilustracion" />
        </div>
      </section>

      <section className="inicio-publico__ventajas" aria-labelledby="inicio-ventajas-titulo">
        <div className="inicio-publico__interior">
          <h2 id="inicio-ventajas-titulo">¿Por qué elegir Tutorías?</h2>
          <ul className="inicio-publico__beneficios">
            {VENTAJAS.map(({ titulo, descripcion, icono }) => (
              <li key={titulo}>
                <span className="inicio-publico__icono"><Icon name={icono} size={24} /></span>
                <div><h3>{titulo}</h3><p>{descripcion}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="inicio-publico__funcionamiento" aria-labelledby="inicio-pasos-titulo">
        <div className="inicio-publico__interior">
          <h2 id="inicio-pasos-titulo">Cómo funciona</h2>
          <ol className="inicio-publico__pasos">
            {PASOS.map(({ titulo, descripcion }, indice) => (
              <li key={titulo}>
                <span className="inicio-publico__numero" aria-hidden="true">{indice + 1}</span>
                <h3>{titulo}</h3><p>{descripcion}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}
