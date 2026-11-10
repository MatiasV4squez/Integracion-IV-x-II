import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AccesoLayout } from '../../../shared/layout/AccesoLayout'
import { LONGITUD_MAXIMA_CORREO, normalizarCorreo } from '../../../shared/utils/validaciones-formulario'
import type { CredencialesInicioSesion } from '../models/credenciales'
import { MENSAJES_RESULTADO_INICIO_SESION, type EstadoEnvioInicioSesion } from '../models/estado-inicio-sesion'
import {
  CAMPOS_INICIO_SESION, LONGITUD_MAXIMA_CONTRASENA, validarInicioSesion,
  type CampoInicioSesion, type ErroresInicioSesion,
} from '../utils/validar-inicio-sesion'
import './InicioSesionPage.css'

const CAMPOS: ReadonlyArray<{
  campo: CampoInicioSesion; etiqueta: string; tipo: string; autoComplete: string; placeholder: string; maximo: number
}> = [
  { campo: 'correo', etiqueta: 'Correo institucional', tipo: 'email', autoComplete: 'username', placeholder: 'nombre@alu.uct.cl', maximo: LONGITUD_MAXIMA_CORREO },
  { campo: 'contrasena', etiqueta: 'Contraseña', tipo: 'password', autoComplete: 'current-password', placeholder: '••••••••••••', maximo: LONGITUD_MAXIMA_CONTRASENA },
]

export default function InicioSesionPage({ envio, iniciarSesion }: {
  envio: EstadoEnvioInicioSesion
  iniciarSesion: (credenciales: CredencialesInicioSesion) => void
}) {
  const [credenciales, setCredenciales] = useState<CredencialesInicioSesion>({ correo: '', contrasena: '' })
  const [errores, setErrores] = useState<ErroresInicioSesion>({})
  const enviando = envio === 'enviando'
  const resultado = envio === 'inactivo' || enviando ? undefined : MENSAJES_RESULTADO_INICIO_SESION[envio]

  function cambiar(campo: CampoInicioSesion) {
    return (evento: ChangeEvent<HTMLInputElement>) => {
      const siguiente = { ...credenciales, [campo]: evento.currentTarget.value }
      setCredenciales(siguiente)
      setErrores((previos) => {
        if (!previos[campo]) return previos
        const actualizados = { ...previos }
        const error = validarInicioSesion(siguiente)[campo]
        if (error) actualizados[campo] = error
        else delete actualizados[campo]
        return actualizados
      })
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    const erroresCampo = validarInicioSesion(credenciales)
    setErrores(erroresCampo)
    const primerCampo = CAMPOS_INICIO_SESION.find((campo) => erroresCampo[campo])
    if (primerCampo) {
      evento.currentTarget.querySelector<HTMLInputElement>(`[name="${primerCampo}"]`)?.focus()
      return
    }
    iniciarSesion(credenciales)
  }

  return (
    <AccesoLayout
      idTitulo="inicio-sesion-titulo"
      pestanaActiva="login"
      titulo="Bienvenido de vuelta"
      descripcion="Ingresa con tu cuenta institucional para continuar."
      cargando={enviando}
      anunciarEstado
    >
      {resultado && (
        <p className="inicio-sesion-resultado" role="alert">
          <strong>{resultado.titulo}.</strong> {resultado.detalle}
        </p>
      )}
      {envio === 'pendiente' && <Link to="/verificar-cuenta" state={{ correo: normalizarCorreo(credenciales.correo) }}
        className="boton-global boton-global--secundario">Verificar mi correo</Link>}
      <form className="inicio-sesion-formulario" onSubmit={enviar} noValidate>
        {CAMPOS.map(({ campo, etiqueta, tipo, autoComplete, placeholder, maximo }) => (
          <div className="inicio-sesion-campo" key={campo}>
            <label htmlFor={`inicio-sesion-${campo}`}>{etiqueta}</label>
            <input
              type={tipo}
              id={`inicio-sesion-${campo}`}
              name={campo}
              autoComplete={autoComplete}
              placeholder={placeholder}
              maxLength={maximo}
              required
              disabled={enviando}
              value={credenciales[campo]}
              onChange={cambiar(campo)}
              aria-invalid={errores[campo] ? true : undefined}
              aria-describedby={errores[campo] ? `error-inicio-sesion-${campo}` : undefined}
            />
            {errores[campo] && (
              <p id={`error-inicio-sesion-${campo}`} className="inicio-sesion-campo__error" role="alert">{errores[campo]}</p>
            )}
          </div>
        ))}
        <button type="submit" className="boton-global boton-global--primario" disabled={enviando}>
          {enviando ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>
    </AccesoLayout>
  )
}
