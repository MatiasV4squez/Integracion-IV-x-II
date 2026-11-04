import { obtenerUrlApi } from '../../../config/api'
import type { SesionUsuario } from '../../../shared/auth/sesion-usuario'
import { esIdentificador } from '../../../shared/utils/identificadores'
import type { BloqueDisponibilidad, HorarioDisponibilidad, CambiosDisponibilidad } from '../models/bloque-disponibilidad'

function esBloqueDisponibilidad(valor: unknown): valor is BloqueDisponibilidad {

    if (!valor || typeof valor !== 'object')
        return false

    const bloque = valor as Record<string, unknown>
    if (
        typeof bloque.dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(bloque.dia)
    )

    {
        return false
    }

    const fecha = new Date(`${bloque.dia}T00:00:00.000Z`)
    const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/

    return (
        esIdentificador(bloque.idBloque) && Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === bloque.dia &&
        typeof bloque.horaInicio === 'string' && formatoHora.test(bloque.horaInicio) && typeof bloque.horaFin === 'string' &&
        formatoHora.test(bloque.horaFin) && bloque.horaInicio < bloque.horaFin && ['DISPONIBLE', 'RESERVADO', 'INACTIVO'].some(
        (estado) => estado === bloque.estadoBloque,
        )
    )
}

export async function consultarBloquesDisponibilidad(sesion: SesionUsuario, externa?: AbortSignal): Promise<BloqueDisponibilidad[]> {externa?.throwIfAborted()

    if (!sesion.token || sesion.expiraEn <= Date.now()) {
        throw new Error('Debes iniciar sesión nuevamente.')
    }

    if (!sesion.roles.includes('TUTOR')) {
        throw new Error('Esta sección está disponible para tutores.')
    }

    const signal = AbortSignal.any([
        AbortSignal.timeout(10000), ...(externa ? [externa] : []),
    ])

    try {
        const respuesta = await fetch(
        obtenerUrlApi('materias-tutores/disponibilidad/bloques'),
        {
            headers: {
            Authorization: `Bearer ${sesion.token}`,
            Accept: 'application/json',
            },
            cache: 'no-store',
            signal,
        },
        )

        if (respuesta.status === 401) {
        throw new Error('Tu sesión venció. Inicia sesión nuevamente.')
        }

        if (respuesta.status === 403) {
        throw new Error('No tienes permiso para consultar estos bloques.')
        }

        if (!respuesta.ok) {
        throw new Error('No pudimos consultar tu disponibilidad.')
        }

        const datos: unknown = await respuesta.json()

        if (
        !Array.isArray(datos) ||
        !datos.every(esBloqueDisponibilidad) || new Set(datos.map((bloque) => bloque.idBloque)).size !== datos.length
        ) {
        throw new Error('El servidor devolvió bloques no válidos.')
        }

        return datos
    } catch (error) {
        if (externa?.aborted) throw error

        if (signal.aborted) {
        throw new Error('La consulta tardó demasiado. Inténtalo nuevamente.')
        }

        if (error instanceof TypeError) {
        throw new Error('No pudimos conectar con el servidor.')
        }

        if (error instanceof SyntaxError) {
        throw new Error('No pudimos leer la respuesta del servidor.')
        }

        throw error
    }
    }

export async function crearBloqueDisponibilidad(sesion: SesionUsuario, horario: HorarioDisponibilidad, externa?: AbortSignal,): Promise<BloqueDisponibilidad> {
    externa?.throwIfAborted()

    if (!sesion.token || sesion.expiraEn <= Date.now()) {
      throw new Error('Debes iniciar sesión nuevamente.')
    }

    if (!sesion.roles.includes('TUTOR')) {
      throw new Error('Esta sección está disponible para tutores.')
    }

    const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : []),
    ])

    const mensajeSinConfirmacion = 'No pudimos confirmar la creación. Actualiza el listado antes de intentar nuevamente.'

    try {
      const respuesta = await fetch(
        obtenerUrlApi('materias-tutores/disponibilidad/bloques'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sesion.token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dia: horario.dia,
            horaInicio: horario.horaInicio,
            horaFin: horario.horaFin,
          }),
          signal,
        },
      )

      if (respuesta.status === 401) {
        throw new Error('Tu sesión venció. Inicia sesión nuevamente.')
      }

      if (respuesta.status === 403) {
        throw new Error('No tienes permiso para crear bloques.')
      }

      if (respuesta.status === 400) {
        throw new Error('Revisa la fecha y las horas del bloque.')
      }

      if (respuesta.status === 409) {
        throw new Error('Ese horario se solapa con otro bloque.')
      }

      if (respuesta.status !== 201) {
        throw new Error(mensajeSinConfirmacion)
      }

      const datos: unknown = await respuesta.json()

      if (
        !esBloqueDisponibilidad(datos) ||
        datos.estadoBloque !== 'DISPONIBLE' ||
        datos.dia !== horario.dia ||
        datos.horaInicio !== horario.horaInicio ||
        datos.horaFin !== horario.horaFin
      ) {
        throw new Error(mensajeSinConfirmacion)
      }

      return datos
    } catch (error) {
      if (externa?.aborted) throw error

      if (
        signal.aborted ||
        error instanceof TypeError ||
        error instanceof SyntaxError
      ) {
        throw new Error(mensajeSinConfirmacion)
      }

      throw error
    }
}

export async function actualizarBloqueDisponibilidad(sesion: SesionUsuario, idBloque: string, cambios: CambiosDisponibilidad, externa?: AbortSignal,): Promise<BloqueDisponibilidad> {
    externa?.throwIfAborted()

    if (!sesion.token || sesion.expiraEn <= Date.now()) {
        throw new Error('Debes iniciar sesión nuevamente.')
    }

    if (!sesion.roles.includes('TUTOR')) {
        throw new Error('Esta sección está disponible para tutores.')
    }

    if (!esIdentificador(idBloque)) {
        throw new Error('El identificador del bloque no es válido.')
    }

    const cuerpo = {
        dia: cambios.dia,
        horaInicio: cambios.horaInicio,
        horaFin: cambios.horaFin,
    }

    if (Object.values(cuerpo).every((valor) => valor === undefined)) {
        throw new Error('Indica al menos un campo para actualizar.')
    }

    const signal = AbortSignal.any([
        AbortSignal.timeout(10000),
        ...(externa ? [externa] : []),
    ])

    const mensajeSinConfirmacion =
        'No pudimos confirmar la edición. Actualiza el listado antes de intentar nuevamente.'

    try {
        const respuesta = await fetch(
        obtenerUrlApi(`materias-tutores/disponibilidad/bloques/${idBloque}`),
        {
            method: 'PATCH',
            headers: {
            Authorization: `Bearer ${sesion.token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            },
            body: JSON.stringify(cuerpo),
            signal,
        },
        )

        if (respuesta.status === 401) {
        throw new Error('Tu sesión venció. Inicia sesión nuevamente.')
        }

        if (respuesta.status === 403) {
        throw new Error('No tienes permiso para editar bloques.')
        }

        if (respuesta.status === 400) {
        throw new Error('Revisa la fecha y las horas del bloque.')
        }

        if (respuesta.status === 404) {
        throw new Error('El bloque no se encontró. Actualiza el listado.')
        }

        if (respuesta.status === 409) {
        throw new Error(
            'El bloque cambió o no permite modificaciones. Actualiza el listado.',
        )
        }

        if (respuesta.status !== 200) {
        throw new Error(mensajeSinConfirmacion)
        }

        const datos: unknown = await respuesta.json()

        if (
        !esBloqueDisponibilidad(datos) ||
        datos.idBloque !== idBloque ||
        datos.estadoBloque !== 'DISPONIBLE' ||
        (cambios.dia !== undefined && datos.dia !== cambios.dia) ||
        (cambios.horaInicio !== undefined &&
            datos.horaInicio !== cambios.horaInicio) ||
        (cambios.horaFin !== undefined &&
            datos.horaFin !== cambios.horaFin)
        ) {
        throw new Error(mensajeSinConfirmacion)
        }

        return datos

    } catch (error) {
        if (externa?.aborted) throw error

        if (
        signal.aborted ||
        error instanceof TypeError ||
        error instanceof SyntaxError
        ) {
        throw new Error(mensajeSinConfirmacion)
        }

        throw error
    }
}

export async function eliminarBloqueDisponibilidad(sesion: SesionUsuario, idBloque: string, externa?: AbortSignal,): Promise<BloqueDisponibilidad> {
    externa?.throwIfAborted()

    if (!sesion.token || sesion.expiraEn <= Date.now()) {
      throw new Error('Debes iniciar sesión nuevamente.')
    }

    if (!sesion.roles.includes('TUTOR')) {
      throw new Error('Esta sección está disponible para tutores.')
    }

    if (!esIdentificador(idBloque)) {
      throw new Error('El identificador del bloque no es válido.')
    }

    const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(externa ? [externa] : []),
    ])

    const mensajeSinConfirmacion = 'No pudimos confirmar la eliminación. Actualiza el listado antes de intentar nuevamente.'

    try {
      const respuesta = await fetch(
        obtenerUrlApi(`materias-tutores/disponibilidad/bloques/${idBloque}`),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${sesion.token}`,
            Accept: 'application/json',
          },
          signal,
        },
      )

      if (respuesta.status === 401) {
        throw new Error('Tu sesión venció. Inicia sesión nuevamente.')
      }

      if (respuesta.status === 403) {
        throw new Error('No tienes permiso para eliminar bloques.')
      }

      if (respuesta.status === 404) {
        throw new Error('El bloque no se encontró. Actualiza el listado.')
      }

      if (respuesta.status === 409) {
        throw new Error(
          'El bloque cambió o no permite su eliminación. Actualiza el listado.',
        )
      }

      if (respuesta.status !== 200) {
        throw new Error(mensajeSinConfirmacion)
      }

      const datos: unknown = await respuesta.json()

      if (!esBloqueDisponibilidad(datos) || datos.idBloque !== idBloque || datos.estadoBloque !== 'INACTIVO') {
        throw new Error(mensajeSinConfirmacion)
      }

      return datos
    } catch (error) {
      if (externa?.aborted) throw error

      if (signal.aborted || error instanceof TypeError || error instanceof SyntaxError) {
        throw new Error(mensajeSinConfirmacion)
      }

      throw error
    }
}
