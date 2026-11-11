import { useState, type FormEvent } from 'react'
import type { Materia } from '../../materias/models/materia'
import { SelectorAsignaturasInteres } from '../components/SelectorAsignaturasInteres'
import { LIMITES_PERFIL, type CambiosPerfil, type ConsultaPerfil, type EstadoGuardadoPerfil, type PerfilUsuario } from '../models/perfil'
import {
  CAMPOS_PERFIL, calcularCambiosPerfil, desdePerfil, validarFormularioPerfil,
  type CampoPerfil, type ErroresPerfil, type FormularioPerfil,
} from '../utils/formulario-perfil'
import './PerfilPage.css'

interface Propiedades {
  consulta: ConsultaPerfil
  materias: Materia[]
  cargandoMaterias: boolean
  editando: boolean
  guardado: EstadoGuardadoPerfil
  onReintentar: () => void
  onEditar: () => void
  onCancelar: () => void
  onGuardar: (cambios: CambiosPerfil) => void
}

export default function PerfilPage({
  consulta, materias, cargandoMaterias, editando, guardado, onReintentar, onEditar, onCancelar, onGuardar,
}: Propiedades) {
  return (
    <main className="perfil-propio" aria-labelledby="perfil-propio-titulo">
      <h1 id="perfil-propio-titulo">Mi perfil</h1>
      <p className="perfil-propio__subtitulo">Esta información ayuda a tutores y estudiantes a conocerte.</p>
      {consulta.estado === 'cargando' ? (
        <section className="perfil-propio__tarjeta" role="status"><p>Cargando tu perfil…</p></section>
      ) : consulta.estado === 'error' ? (
        <section className="perfil-propio__tarjeta" role="alert">
          <p>{consulta.mensaje}</p>
          {consulta.tipo === 'consulta' && (
            <button type="button" className="boton-global boton-global--secundario" onClick={onReintentar}>Reintentar</button>
          )}
        </section>
      ) : editando ? (
        <FormularioEdicion
          key={consulta.perfil.id}
          perfil={consulta.perfil}
          materias={materias}
          cargandoMaterias={cargandoMaterias}
          guardado={guardado}
          onCancelar={onCancelar}
          onGuardar={onGuardar}
        />
      ) : (
        <ResumenPerfil perfil={consulta.perfil} materias={materias} guardado={guardado} onEditar={onEditar} />
      )}
    </main>
  )
}

function ResumenPerfil({ perfil, materias, guardado, onEditar }: {
  perfil: PerfilUsuario
  materias: Materia[]
  guardado: EstadoGuardadoPerfil
  onEditar: () => void
}) {
  const porId = new Map(materias.map((materia) => [materia.idMateria, materia]))
  return (
    <section className="perfil-propio__tarjeta" aria-labelledby="perfil-propio-nombre">
      <div role="status" aria-live="polite">
        {guardado.estado === 'exitoso' && <p className="perfil-propio__aviso perfil-propio__aviso--exito">Tus cambios se guardaron correctamente.</p>}
      </div>
      <div className="perfil-propio__cabecera">
        <div>
          <h2 id="perfil-propio-nombre">{perfil.nombre}</h2>
          <p className="perfil-propio__correo">{perfil.correo_institucional}</p>
        </div>
        <button type="button" className="boton-global boton-global--primario" onClick={onEditar}>Editar perfil</button>
      </div>
      <dl className="perfil-propio__datos">
        <dt>Carrera</dt><dd>{perfil.carrera ?? <span className="perfil-propio__vacio">Sin indicar</span>}</dd>
        <dt>Semestre</dt><dd>{perfil.semestre_actual ?? <span className="perfil-propio__vacio">Sin indicar</span>}</dd>
        <dt>Biografía</dt><dd className="perfil-propio__biografia">{perfil.biografia ?? <span className="perfil-propio__vacio">Aún no escribes una biografía.</span>}</dd>
        <dt>Asignaturas de interés</dt>
        <dd>
          {perfil.asignaturas_interes.length === 0 ? <span className="perfil-propio__vacio">Aún no eliges asignaturas.</span> : (
            <ul className="perfil-propio__etiquetas">
              {perfil.asignaturas_interes.map((id) => (
                <li key={id}>{porId.get(id)?.nombre ?? 'Materia #' + id}</li>
              ))}
            </ul>
          )}
        </dd>
      </dl>
    </section>
  )
}

function FormularioEdicion({ perfil, materias, cargandoMaterias, guardado, onCancelar, onGuardar }: {
  perfil: PerfilUsuario
  materias: Materia[]
  cargandoMaterias: boolean
  guardado: EstadoGuardadoPerfil
  onCancelar: () => void
  onGuardar: (cambios: CambiosPerfil) => void
}) {
  const [formulario, setFormulario] = useState(() => desdePerfil(perfil))
  const [errores, setErrores] = useState<ErroresPerfil>({})
  const guardando = guardado.estado === 'guardando'
  const cambios = calcularCambiosPerfil(perfil, formulario)
  const sinCambios = Object.keys(cambios).length === 0
  // Asignaturas guardadas que ya no están en el catálogo siguen visibles para poder quitarlas.
  const desconocidas = formulario.asignaturas.filter((id) => !materias.some((materia) => materia.idMateria === id))

  function cambiar<C extends CampoPerfil>(campo: C, valor: FormularioPerfil[C]) {
    const siguiente = { ...formulario, [campo]: valor }
    setFormulario(siguiente)
    if (errores[campo]) setErrores((previos) => ({ ...previos, [campo]: validarFormularioPerfil(siguiente)[campo] }))
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (guardando || sinCambios) return
    const encontrados = validarFormularioPerfil(formulario)
    setErrores(encontrados)
    const primero = CAMPOS_PERFIL.find((campo) => encontrados[campo])
    if (primero) {
      evento.currentTarget.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus()
      return
    }
    onGuardar(cambios)
  }

  const textos: Array<{ campo: 'nombre' | 'carrera'; etiqueta: string; maximo: number; autoComplete: string; placeholder: string }> = [
    { campo: 'nombre', etiqueta: 'Nombre completo', maximo: LIMITES_PERFIL.nombre, autoComplete: 'name', placeholder: 'Ej. Camila González' },
    { campo: 'carrera', etiqueta: 'Carrera', maximo: LIMITES_PERFIL.carrera, autoComplete: 'off', placeholder: 'Ej. Ingeniería Civil en Informática' },
  ]

  return (
    <form className="perfil-propio__tarjeta perfil-propio__formulario" onSubmit={enviar} noValidate aria-busy={guardando}>
      {guardado.estado === 'error' && <p className="perfil-propio__aviso perfil-propio__aviso--error" role="alert">{guardado.mensaje}</p>}
      <p className="perfil-propio__ayuda">Correo institucional: <strong>{perfil.correo_institucional}</strong> (no se puede modificar)</p>

      {textos.map(({ campo, etiqueta, maximo, autoComplete, placeholder }) => (
        <div className="perfil-propio__campo" key={campo}>
          <label htmlFor={'perfil-' + campo}>{etiqueta}{campo === 'nombre' ? '' : ' (opcional)'}</label>
          <input
            id={'perfil-' + campo} name={campo} type="text" maxLength={maximo} autoComplete={autoComplete} placeholder={placeholder}
            value={formulario[campo]} disabled={guardando} required={campo === 'nombre'}
            onChange={(evento) => cambiar(campo, evento.currentTarget.value)}
            aria-invalid={errores[campo] ? true : undefined}
            aria-describedby={errores[campo] ? 'perfil-error-' + campo : undefined}
          />
          {errores[campo] && <p id={'perfil-error-' + campo} className="perfil-propio__error" role="alert">{errores[campo]}</p>}
        </div>
      ))}

      <div className="perfil-propio__campo">
        <label htmlFor="perfil-semestre">Semestre actual (opcional)</label>
        <select
          id="perfil-semestre" name="semestre" value={formulario.semestre} disabled={guardando}
          onChange={(evento) => cambiar('semestre', evento.currentTarget.value)}
          aria-invalid={errores.semestre ? true : undefined}
          aria-describedby={errores.semestre ? 'perfil-error-semestre' : undefined}
        >
          <option value="">Sin indicar</option>
          {Array.from({ length: LIMITES_PERFIL.semestreMaximo }, (_, indice) => indice + 1).map((semestre) => (
            <option key={semestre} value={String(semestre)}>{semestre}° semestre</option>
          ))}
        </select>
        {errores.semestre && <p id="perfil-error-semestre" className="perfil-propio__error" role="alert">{errores.semestre}</p>}
      </div>

      <div className="perfil-propio__campo">
        <label htmlFor="perfil-biografia">Biografía (opcional)</label>
        <textarea
          id="perfil-biografia" name="biografia" rows={5} maxLength={LIMITES_PERFIL.biografia} disabled={guardando}
          placeholder="Cuéntales a los demás qué estudias y en qué te gustaría apoyar o recibir apoyo."
          value={formulario.biografia}
          onChange={(evento) => cambiar('biografia', evento.currentTarget.value)}
          aria-invalid={errores.biografia ? true : undefined}
          aria-describedby={'perfil-biografia-contador' + (errores.biografia ? ' perfil-error-biografia' : '')}
        />
        <p id="perfil-biografia-contador" className="perfil-propio__ayuda">{formulario.biografia.length} / {LIMITES_PERFIL.biografia} caracteres</p>
        {errores.biografia && <p id="perfil-error-biografia" className="perfil-propio__error" role="alert">{errores.biografia}</p>}
      </div>

      {cargandoMaterias ? <p role="status">Cargando asignaturas…</p> : (
        <SelectorAsignaturasInteres
          materias={materias}
          seleccionadas={formulario.asignaturas}
          deshabilitado={guardando}
          error={errores.asignaturas}
          onCambiar={(asignaturas) => cambiar('asignaturas', asignaturas)}
        />
      )}
      {desconocidas.length > 0 && (
        <div className="perfil-propio__desconocidas">
          <p className="perfil-propio__ayuda">Estas asignaturas ya no aparecen en el catálogo:</p>
          <ul className="perfil-propio__etiquetas">
            {desconocidas.map((id) => (
              <li key={id}>
                Materia #{id}{' '}
                <button type="button" disabled={guardando} aria-label={'Quitar materia #' + id}
                  onClick={() => cambiar('asignaturas', formulario.asignaturas.filter((otra) => otra !== id))}>Quitar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="perfil-propio__acciones">
        <button type="button" className="boton-global boton-global--secundario" disabled={guardando} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton-global boton-global--primario" disabled={guardando || sinCambios}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
