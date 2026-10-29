import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AccesoLayout } from '../../../shared/layout/AccesoLayout'
import { LONGITUD_MAXIMA_CORREO } from '../../../shared/utils/validaciones-formulario'
import type { DatosRegistroUsuario, FormularioRegistroUsuario } from '../models/datos-registro'
import { MENSAJES_RESULTADO_REGISTRO, type EstadoEnvioRegistro } from '../models/estado-registro'
import {
  CAMPOS_REGISTRO, LONGITUD_MAXIMA_CONTRASENA, LONGITUD_MAXIMA_NOMBRE, LONGITUD_MINIMA_CONTRASENA,
  validarRegistro, type CampoRegistro, type ErroresRegistro,
} from '../utils/validar-registro'
import './RegistroUsuarioPage.css'

const CAMPOS: ReadonlyArray<{
  campo: CampoRegistro; etiqueta: string; tipo: string; autoComplete: string; placeholder: string; maximo: number
}> = [
  { campo: 'nombre', etiqueta: 'Nombre completo', tipo: 'text', autoComplete: 'name', placeholder: 'Ej. Camila González', maximo: LONGITUD_MAXIMA_NOMBRE },
  { campo: 'correo', etiqueta: 'Correo institucional', tipo: 'email', autoComplete: 'email', placeholder: 'nombre@alu.uct.cl', maximo: LONGITUD_MAXIMA_CORREO },
  { campo: 'contrasena', etiqueta: 'Contraseña', tipo: 'password', autoComplete: 'new-password', placeholder: `Mínimo ${LONGITUD_MINIMA_CONTRASENA} caracteres`, maximo: LONGITUD_MAXIMA_CONTRASENA },
  { campo: 'confirmacion', etiqueta: 'Confirmar contraseña', tipo: 'password', autoComplete: 'new-password', placeholder: 'Repite tu contraseña', maximo: LONGITUD_MAXIMA_CONTRASENA },
]

const FORMULARIO_INICIAL: FormularioRegistroUsuario = { nombre: '', correo: '', contrasena: '', confirmacion: '' }

export default function RegistroUsuarioPage({ envio, registrar }: {
  envio: EstadoEnvioRegistro
  registrar: (datos: DatosRegistroUsuario) => void
}) {
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [errores, setErrores] = useState<ErroresRegistro>({})
  const enviando = envio === 'enviando'
  const exitoso = envio === 'exitoso'
  const resultado = exitoso || envio === 'invalido' || envio === 'duplicado' || envio === 'error'
    ? MENSAJES_RESULTADO_REGISTRO[envio] : undefined

  function cambiar(campo: CampoRegistro) {
    return (evento: ChangeEvent<HTMLInputElement>) => {
      const siguiente = { ...formulario, [campo]: evento.currentTarget.value }
      setFormulario(siguiente)
      setErrores((previos) => {
        const marcados = CAMPOS_REGISTRO.filter((otro) => previos[otro])
        if (!marcados.length) return previos
        const validados = validarRegistro(siguiente)
        const actualizados: ErroresRegistro = {}
        for (const otro of marcados) {
          if (validados[otro]) actualizados[otro] = validados[otro]
        }
        return actualizados
      })
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    const erroresCampo = validarRegistro(formulario)
    setErrores(erroresCampo)
    const primerCampo = CAMPOS_REGISTRO.find((campo) => erroresCampo[campo])
    if (primerCampo) {
      evento.currentTarget.querySelector<HTMLInputElement>(`[name="${primerCampo}"]`)?.focus()
      return
    }
    registrar({ nombre: formulario.nombre, correo: formulario.correo, contrasena: formulario.contrasena })
  }

  return (
    <AccesoLayout
      idTitulo="registro-titulo"
      pestanaActiva="register"
      titulo={exitoso && resultado ? resultado.titulo : 'Crea tu cuenta'}
      descripcion={exitoso && resultado ? resultado.detalle : 'Regístrate con tu correo institucional.'}
      cargando={enviando}
      anunciarEstado
    >
      {resultado && !exitoso && (
        <p className="registro-resultado" role="alert">
          <strong>{resultado.titulo}.</strong> {resultado.detalle}
        </p>
      )}
      {!exitoso && (
        <form className="registro-formulario" onSubmit={enviar} noValidate>
          {CAMPOS.map(({ campo, etiqueta, tipo, autoComplete, placeholder, maximo }) => (
            <div className="registro-campo" key={campo}>
              <label htmlFor={`registro-${campo}`}>{etiqueta}</label>
              <input
                type={tipo}
                id={`registro-${campo}`}
                name={campo}
                autoComplete={autoComplete}
                placeholder={placeholder}
                maxLength={maximo}
                required
                disabled={enviando}
                value={formulario[campo]}
                onChange={cambiar(campo)}
                aria-invalid={errores[campo] ? true : undefined}
                aria-describedby={errores[campo] ? `error-registro-${campo}` : undefined}
              />
              {errores[campo] && (
                <p id={`error-registro-${campo}`} className="registro-campo__error" role="alert">{errores[campo]}</p>
              )}
            </div>
          ))}
          <button type="submit" className="boton-global boton-global--primario" disabled={enviando}>
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
      )}
      {exitoso && <Link to="/login" className="boton-global boton-global--primario">Ir a iniciar sesión <span aria-hidden="true">→</span></Link>}
    </AccesoLayout>
  )
}
