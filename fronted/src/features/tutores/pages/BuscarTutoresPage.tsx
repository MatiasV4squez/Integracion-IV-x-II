import { EstadoConsultaMaterias } from '../../materias/components/EstadoConsultaMaterias'
import type { Materia } from '../../materias/models/materia'
import { BusquedaTutoresForm } from '../components/BusquedaTutoresForm'
import { EstadoBusquedaTutores } from '../components/EstadoBusquedaTutores'
import { FiltrosTutores } from '../components/FiltrosTutores'
import { PaginacionTutores } from '../components/PaginacionTutores'
import { TutorCard } from '../components/TutorCard'
import type { CriteriosBusquedaTutores } from '../models/criterios-busqueda-tutores'
import type { ConsultaTutores } from '../models/consulta-tutores'
import './BuscarTutoresPage.css'

interface BuscarTutoresPageProps {
  materias: Materia[]
  materiaId: string
  cargandoMaterias: boolean
  errorMaterias?: string
  onReintentarMaterias: () => void
  consulta: ConsultaTutores
  onBuscar: (criterios: CriteriosBusquedaTutores) => void
  onReintentar?: () => void
  onCambiarPagina: (page: number) => void
  onVerPerfil?: (idTutor: string) => void
}

export default function BuscarTutoresPage({
  materias, materiaId, cargandoMaterias, errorMaterias, onReintentarMaterias,
  consulta, onBuscar, onReintentar, onCambiarPagina, onVerPerfil,
}: BuscarTutoresPageProps) {
  const resultado = consulta.estado === 'listo' ? consulta.resultado : undefined
  const materia = materias.find((item) => item.idMateria === materiaId)

  return (
    <main className="buscar-tutores" aria-labelledby="buscar-tutores-titulo">
      <h1 id="buscar-tutores-titulo">Buscar tutores</h1>
      <p className="buscar-tutores__subtitulo">
        Busca estudiantes habilitados por materia y consulta sus horarios y calificaciones.
      </p>

      {cargandoMaterias ? (
        <EstadoConsultaMaterias estado="cargando" />
      ) : errorMaterias ? (
        <EstadoConsultaMaterias estado="error" mensaje={errorMaterias} onReintentar={onReintentarMaterias} />
      ) : (
        <>
          <BusquedaTutoresForm key={materiaId} materias={materias} materiaInicialId={materiaId} onBuscar={onBuscar} />

          <div className="buscar-tutores__contenido">
            <FiltrosTutores />

            <section className="buscar-tutores__resultados" aria-labelledby="buscar-tutores-resultados" aria-busy={consulta.estado === 'cargando'}>
              <div role="status" aria-atomic="true">
                <h2 id="buscar-tutores-resultados">
                  {resultado
                    ? resultado.total + (resultado.total === 1 ? ' tutor encontrado' : ' tutores encontrados')
                    : 'Resultados de búsqueda'}
                </h2>
              </div>
              {materia && <p className="buscar-tutores__materia-aplicada">Para {materia.nombre} · {materia.codigo}</p>}
              {consulta.estado === 'cargando' ? (
                <EstadoBusquedaTutores estado="cargando" />
              ) : consulta.estado === 'error' ? (
                <EstadoBusquedaTutores estado="error" mensaje={consulta.mensaje} onReintentar={onReintentar} />
              ) : resultado && resultado.items.length > 0 ? (
                <ul className="buscar-tutores__lista">
                  {resultado.items.map((tutor) => (
                    <li key={tutor.idTutor}>
                      <TutorCard tutor={tutor} onVerPerfil={onVerPerfil} />
                    </li>
                  ))}
                </ul>
              ) : (
                resultado && resultado.total > 0
                  ? <EstadoBusquedaTutores estado="pagina-vacia" onVolver={() => onCambiarPagina(1)} />
                  : <EstadoBusquedaTutores estado={resultado ? 'vacio' : 'inicial'} />
              )}
              {resultado && <PaginacionTutores page={resultado.page} totalPages={resultado.totalPages} onCambiarPagina={onCambiarPagina} />}
            </section>
          </div>
        </>
      )}
    </main>
  )
}
