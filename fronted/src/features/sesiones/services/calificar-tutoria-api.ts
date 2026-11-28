import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { DetalleTutoria } from '../models/tutoria'
import { esCalificacion, esPuntuacionTutoria } from '../utils/validar-tutoria'

export class ErrorCalificarTutoria extends Error {
  readonly comprobarEstado: boolean

  constructor(mensaje: string, comprobarEstado = false) {
    super(mensaje)
    this.comprobarEstado = comprobarEstado
  }
}

export async function calificarTutoria(sesion: SesionUsuario, tutoria: DetalleTutoria, puntuacion: number, signal: AbortSignal) {
  signal.throwIfAborted()
  if (!sesion.token || !esIdentificador(sesion.idUsuario) || sesion.expiraEn <= Date.now()) {
    throw new ErrorCalificarTutoria('Tu sesión venció. Actualiza el detalle para volver a iniciar sesión.', true)
  }
  const evaluado = sesion.idUsuario === tutoria.id_tutor ? tutoria.id_tutee : tutoria.id_tutor
  const participante = sesion.idUsuario === tutoria.id_tutor || sesion.idUsuario === tutoria.id_tutee
  if (!participante || evaluado === sesion.idUsuario || !esIdentificador(tutoria.id_sesion)
    || tutoria.estado_sesion !== 'COMPLETADA' || !tutoria.acciones_disponibles.calificar
    || tutoria.calificaciones.some((nota) => nota.id_evaluador === sesion.idUsuario)) {
    throw new ErrorCalificarTutoria('Esta tutoría no está disponible para calificar. Actualiza el detalle.', true)
  }
  if (!esPuntuacionTutoria(puntuacion)) throw new ErrorCalificarTutoria('Selecciona una calificación de 1 a 5.')

  const incierto = () => new ErrorCalificarTutoria(
    'No pudimos confirmar el envío. Actualiza el detalle para saber si se registró tu calificación.', true,
  )
  try {
    const respuesta = await fetch(obtenerUrlApi('agendamiento-sesiones/sessions/' + tutoria.id_sesion + '/ratings'), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token },
      body: JSON.stringify({ puntuacion }),
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    })
    if (respuesta.status === 401) throw new ErrorCalificarTutoria('Tu sesión venció. Actualiza el detalle para volver a iniciar sesión.', true)
    if ([403, 404, 409].includes(respuesta.status)) {
      throw new ErrorCalificarTutoria('Ya no puedes calificar con el estado mostrado. Actualiza el detalle.', true)
    }
    if (respuesta.status === 400) throw new ErrorCalificarTutoria('La API rechazó la calificación. Revisa la puntuación.')
    if (respuesta.status !== 201) throw incierto()

    const datos: unknown = await respuesta.json()
    if (!datos || typeof datos !== 'object' || !('calificacion' in datos) || !esCalificacion(datos.calificacion, tutoria)
      || datos.calificacion.id_evaluador !== sesion.idUsuario || datos.calificacion.id_evaluado !== evaluado
      || datos.calificacion.puntuacion !== puntuacion) throw incierto()
    return datos.calificacion
  } catch (error) {
    if (signal.aborted || error instanceof ErrorCalificarTutoria) throw error
    throw incierto()
  }
}
