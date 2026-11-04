import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { PanelComunidad } from '../../../shared/layout/PanelComunidad'
import { LONGITUD_MAXIMA_CORREO, normalizarCorreo, validarCorreo } from '../../../shared/utils/validaciones-formulario'
import { MENSAJES_VERIFICACION, type EstadoVerificacion as Estado } from '../models/estado-verificacion'
import './VerificacionCuentaPage.css'

export default function VerificacionCuentaPage({ estado, demostracion = false, confirmar, reenviar, reenvio = 'inactivo' }: {
  estado: Estado; demostracion?: boolean; confirmar?: () => void; reenviar?: (correo: string) => void
  reenvio?: 'inactivo' | 'enviando' | 'enviado' | 'error'
}) {
  const [errorCorreo, setErrorCorreo] = useState<string>()
  const mensaje = MENSAJES_VERIFICACION[estado]
  const cargando = estado === 'verificando' || reenvio === 'enviando'

  function solicitarEnlace(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (cargando || demostracion || !reenviar) return
    const correo = normalizarCorreo(String(new FormData(evento.currentTarget).get('correo') ?? ''))
    const error = validarCorreo(correo)
    setErrorCorreo(error)
    if (error) {
      evento.currentTarget.querySelector<HTMLInputElement>('[name="correo"]')?.focus()
      return
    }
    reenviar(correo)
  }

  return (
    <main className="acceso-pagina">
      <div className="acceso-columnas">
        <PanelComunidad />
        <section className="acceso-tarjeta verificacion-tarjeta estado-verificacion" aria-labelledby="verificacion-titulo" aria-busy={cargando}>
          {demostracion && <p className="verificacion-tarjeta__aviso">Vista de demostración: este estado no verifica ni modifica tu cuenta.</p>}
          <div role="status" aria-live="polite" aria-atomic="true">
            {cargando && <span className="estado-verificacion__spinner" aria-hidden="true" />}
            <h1 id="verificacion-titulo">{mensaje.titulo}</h1>
            <p className="estado-verificacion__detalle">{confirmar && estado === 'pendiente'
              ? 'Confirma tu correo institucional para completar el registro.' : mensaje.detalle}</p>
          </div>
          {confirmar && <button type="button" className="boton-global boton-global--primario" disabled={cargando || demostracion} onClick={confirmar}>Confirmar correo</button>}
          {estado !== 'verificada' && reenviar && <form className="verificacion-reenvio" onSubmit={solicitarEnlace} noValidate>
            <label htmlFor="correo-verificacion">¿Necesitas un nuevo enlace? Correo institucional</label>
            <input id="correo-verificacion" name="correo" type="email" autoComplete="email"
              maxLength={LONGITUD_MAXIMA_CORREO} required disabled={cargando || demostracion}
              aria-invalid={errorCorreo ? true : undefined}
              aria-describedby={errorCorreo ? 'error-correo-verificacion' : undefined}
              onChange={(evento) => { if (errorCorreo) setErrorCorreo(validarCorreo(evento.currentTarget.value)) }} />
            {errorCorreo && <p id="error-correo-verificacion" className="verificacion-reenvio__error" role="alert">{errorCorreo}</p>}
            <button className="boton-global boton-global--secundario" disabled={cargando || demostracion}>
              {reenvio === 'enviando' ? 'Solicitando enlace…' : 'Solicitar nuevo enlace'}
            </button>
            <p role="status" aria-live="polite">{reenvio === 'enviado'
              ? 'Si la cuenta existe y requiere verificación, se enviará un correo. Revisa tu bandeja y abre el enlace más reciente.'
              : reenvio === 'error' ? 'No pudimos solicitar el enlace. Inténtalo más tarde.' : ''}</p>
          </form>}
          {!cargando && <Link to="/login" className="boton-global boton-global--primario">Ir a iniciar sesión <span aria-hidden="true">→</span></Link>}
        </section>
      </div>
    </main>
  )
}
