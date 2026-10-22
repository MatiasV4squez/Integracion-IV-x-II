import { Link } from 'react-router'
import { PanelComunidad } from '../../../shared/layout/PanelComunidad'
import { MENSAJES_VERIFICACION, type EstadoVerificacion as Estado } from '../models/estado-verificacion'
import './VerificacionCuentaPage.css'

export default function VerificacionCuentaPage({ estado, demostracion = false, confirmar, reenviar, reenvio = 'inactivo' }: {
  estado: Estado; demostracion?: boolean; confirmar?: () => void; reenviar?: (correo: string) => void
  reenvio?: 'inactivo' | 'enviando' | 'enviado' | 'error'
}) {
  const mensaje = MENSAJES_VERIFICACION[estado]
  const cargando = estado === 'verificando' || reenvio === 'enviando'
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
          {estado !== 'verificada' && reenviar && <form className="verificacion-reenvio" onSubmit={(evento) => {
            evento.preventDefault()
            reenviar(String(new FormData(evento.currentTarget).get('correo') ?? ''))
          }}>
            <label htmlFor="correo-verificacion">¿Necesitas un nuevo enlace? Correo institucional</label>
            <input id="correo-verificacion" name="correo" type="email" autoComplete="email" maxLength={255} required disabled={cargando || demostracion} />
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
