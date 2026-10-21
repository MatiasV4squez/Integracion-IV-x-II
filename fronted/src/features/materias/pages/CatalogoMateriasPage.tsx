import { useState } from 'react'
import { BuscadorMaterias } from '../components/BuscadorMaterias'
import { EstadoCatalogoVacio } from '../components/EstadoCatalogoVacio'
import { EstadoConsultaMaterias } from '../components/EstadoConsultaMaterias'
import { MateriaCard } from '../components/MateriaCard'
import type { Materia } from '../models/materia'
import { filtrarMaterias } from '../utils/filtrar-materias'
import './CatalogoMateriasPage.css'

interface CatalogoMateriasPageProps {
  materias: Materia[]
  cargando?: boolean
  error?: string
  onReintentar?: () => void
  obtenerDestinoMateria?: (materia: Materia) => string
}

export default function CatalogoMateriasPage({
  materias, cargando = false, error, onReintentar, obtenerDestinoMateria,
}: CatalogoMateriasPageProps) {
  const [busqueda, setBusqueda] = useState('')
  const [consulta, setConsulta] = useState('')
  const materiasVisibles = filtrarMaterias(materias, consulta)

  function limpiarBusqueda() {
    setBusqueda('')
    setConsulta('')
  }

  return (
    <main className="catalogo-materias" aria-labelledby="catalogo-titulo">
      <h1 id="catalogo-titulo">Catálogo de materias</h1>
      <p className="catalogo-materias__subtitulo">
        Explora las asignaturas disponibles para solicitar tutorías.
      </p>

      {cargando ? (
        <EstadoConsultaMaterias estado="cargando" />
      ) : error ? (
        <EstadoConsultaMaterias estado="error" mensaje={error} onReintentar={onReintentar} />
      ) : (
        <>
          <BuscadorMaterias
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            onBuscar={() => setConsulta(busqueda.trim())}
          />

          <section aria-labelledby="catalogo-resultados-titulo">
            <div className="catalogo-materias__resumen">
              <h2 id="catalogo-resultados-titulo">
                {consulta ? 'Resultados de búsqueda' : 'Materias disponibles'}
              </h2>
              <p className="catalogo-materias__cantidad" role="status" aria-atomic="true">
                {materiasVisibles.length} {materiasVisibles.length === 1 ? 'materia' : 'materias'}
                {consulta && <> para «{consulta}»</>}
              </p>
              {consulta && (
                <button className="catalogo-materias__limpiar" type="button" onClick={limpiarBusqueda}>
                  Limpiar búsqueda
                </button>
              )}
            </div>

            {materiasVisibles.length > 0 ? (
              <ul className="catalogo-materias__lista">
                {materiasVisibles.map((materia) => (
                  <li key={materia.codigo}>
                    <MateriaCard materia={materia} destino={obtenerDestinoMateria?.(materia)} />
                  </li>
                ))}
              </ul>
            ) : (
              <EstadoCatalogoVacio sinMaterias={materias.length === 0} />
            )}
          </section>
        </>
      )}
    </main>
  )
}
