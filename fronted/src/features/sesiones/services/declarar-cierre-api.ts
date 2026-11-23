import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import { RESULTADOS_CIERRE, type EntradaCierre } from '../models/tutoria'
import { esSesion } from '../utils/validar-sesion'
import { esDeclaracion } from '../utils/validar-tutoria'

export class ErrorDeclararCierre extends Error {
  readonly comprobarEstado: boolean

  constructor(mensaje: string, comprobarEstado = false) {
    super(mensaje)
    this.comprobarEstado = comprobarEstado
  }
}

export async function declararCierre(id: string, sesion: SesionUsuario, entrada: EntradaCierre, externa: AbortSignal) {
  externa.throwIfAborted()
  if (!sesion.token || !esIdentificador(sesion.idUsuario) || sesion.expiraEn <= Date.now()) {
    throw new ErrorDeclararCierre('Tu sesión venció. Actualiza el detalle para volver a iniciar sesión.', true)
  }

  const inasistente = entrada.resultado_declarado === 'INASISTENCIA' ? entrada.id_usuario_inasistente : null
  if (!esIdentificador(id) || !RESULTADOS_CIERRE.includes(entrada.resultado_declarado)
    || (entrada.resultado_declarado === 'INASISTENCIA' && !esIdentificador(inasistente))) {
    throw new ErrorDeclararCierre('Revisa el resultado y los datos de la declaración.')
  }

  const errorIncierto = () => new ErrorDeclararCierre(
    'No pudimos confirmar el envío. Actualiza el detalle para comprobar si tu declaración se registró.', true,
  )
  try {
    const respuesta = await fetch(obtenerUrlApi('agendamiento-sesiones/sessions/' + id + '/closure-declarations'), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token },
      body: JSON.stringify({ resultado_declarado: entrada.resultado_declarado,
        ...(inasistente !== null ? { id_usuario_inasistente: inasistente } : {}) }),
      cache: 'no-store',
      signal: AbortSignal.any([externa, AbortSignal.timeout(10000)]),
    })
    if (respuesta.status === 401) throw new ErrorDeclararCierre('Tu sesión venció. Actualiza el detalle para volver a iniciar sesión.', true)
    if ([403, 404, 409].includes(respuesta.status)) {
      throw new ErrorDeclararCierre('Ya no puedes declarar el cierre con el estado mostrado. Actualiza el detalle.', true)
    }
    if (respuesta.status === 400) throw new ErrorDeclararCierre('La declaración fue rechazada. Revisa el resultado seleccionado.')
    if (respuesta.status !== 201) throw errorIncierto()

    const datos: unknown = await respuesta.json()
    if (!datos || typeof datos !== 'object' || !('sesion' in datos) || !esSesion(datos.sesion)
      || datos.sesion.id_sesion !== id || !('declaracion' in datos) || !esDeclaracion(datos.declaracion, datos.sesion)
      || datos.declaracion.id_usuario !== sesion.idUsuario || datos.declaracion.resultado_declarado !== entrada.resultado_declarado
      || datos.declaracion.id_usuario_inasistente !== inasistente) {
      throw errorIncierto()
    }
  } catch (error) {
    if (externa.aborted || error instanceof ErrorDeclararCierre) throw error
    throw errorIncierto()
  }
}
