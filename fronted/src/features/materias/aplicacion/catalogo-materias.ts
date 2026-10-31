import type { Materia } from '../models/materia'
import { ErrorConsultaMaterias, esCatalogoValido, obtenerMaterias } from '../services/materias-api'

export const VIGENCIA_CATALOGO_MS = 5 * 60 * 1000
// Una copia guardada más antigua se descarta: el catálogo pudo cambiar demasiado para mostrarla.
export const ANTIGUEDAD_MAXIMA_GUARDADA_MS = 24 * 60 * 60 * 1000
// Evita repetir consultas si una pantalla pide varias veces una materia que realmente no existe.
export const INTERVALO_MINIMO_REVALIDACION_MS = 30 * 1000
export const CLAVE_ALMACENAMIENTO = 'stp:catalogo-materias:v1'

export interface EstadoCatalogo {
  materias: Materia[] | null
  obtenidoEn: number | null
  actualizando: boolean
  error: string | null
}

interface Dependencias {
  consultar: () => Promise<Materia[]>
  ahora: () => number
  almacenamiento?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
}

// Las pantallas comparten este estado: una sola consulta en curso y una sola copia de los datos.
export function crearCatalogoMaterias({ consultar, ahora, almacenamiento = null }: Dependencias) {
  let estado: EstadoCatalogo = { ...leerGuardado(), actualizando: false, error: null }
  let enCurso: Promise<void> | null = null
  const oyentes = new Set<() => void>()

  function leerGuardado(): Pick<EstadoCatalogo, 'materias' | 'obtenidoEn'> {
    const vacio = { materias: null, obtenidoEn: null }
    try {
      const texto = almacenamiento?.getItem(CLAVE_ALMACENAMIENTO)
      if (!texto) return vacio
      const guardado: unknown = JSON.parse(texto)
      if (!guardado || typeof guardado !== 'object' || !('obtenidoEn' in guardado) || !('materias' in guardado)
        || typeof guardado.obtenidoEn !== 'number' || !Number.isFinite(guardado.obtenidoEn)
        || guardado.obtenidoEn > ahora() || ahora() - guardado.obtenidoEn > ANTIGUEDAD_MAXIMA_GUARDADA_MS
        || !esCatalogoValido(guardado.materias)) {
        almacenamiento?.removeItem(CLAVE_ALMACENAMIENTO)
        return vacio
      }
      return {
        materias: guardado.materias.map(({ idMateria, codigo, nombre }) => ({ idMateria, codigo, nombre })),
        obtenidoEn: guardado.obtenidoEn,
      }
    } catch {
      return vacio
    }
  }

  function guardar(materias: Materia[], obtenidoEn: number) {
    try {
      almacenamiento?.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify({ obtenidoEn, materias }))
    } catch {
      // Sin almacenamiento disponible la caché sigue funcionando en memoria.
    }
  }

  function publicar(cambios: Partial<EstadoCatalogo>) {
    estado = { ...estado, ...cambios }
    oyentes.forEach((notificar) => notificar())
  }

  function estaVencido() {
    return estado.obtenidoEn === null || ahora() - estado.obtenidoEn >= VIGENCIA_CATALOGO_MS
  }

  // Sin forzar, reutiliza los datos vigentes. Nunca rechaza: el error queda en el estado.
  function cargar({ forzar = false }: { forzar?: boolean } = {}): Promise<void> {
    if (enCurso) return enCurso
    if (!forzar && !estaVencido()) return Promise.resolve()
    publicar({ actualizando: true, error: null })
    enCurso = consultar()
      .then((materias) => {
        const obtenidoEn = ahora()
        guardar(materias, obtenidoEn)
        publicar({ materias, obtenidoEn, actualizando: false, error: null })
      })
      .catch((error: unknown) => {
        // Si ya había datos se conservan; la pantalla puede avisar que no se pudieron actualizar.
        publicar({
          actualizando: false,
          error: error instanceof ErrorConsultaMaterias ? error.message : 'No pudimos cargar las materias. Inténtalo de nuevo.',
        })
      })
      .finally(() => { enCurso = null })
    return enCurso
  }

  // Una materia ausente puede haberse creado después de la última consulta.
  function revalidarSiFalta(idMateria: string): Promise<void> {
    if (!idMateria || estado.materias === null || estado.materias.some((materia) => materia.idMateria === idMateria)) {
      return Promise.resolve()
    }
    if (estado.obtenidoEn !== null && ahora() - estado.obtenidoEn < INTERVALO_MINIMO_REVALIDACION_MS) {
      return Promise.resolve()
    }
    return cargar({ forzar: true })
  }

  // Sincroniza la copia cuando otra pestaña actualiza el catálogo.
  function sincronizarDesdeAlmacenamiento() {
    const guardado = leerGuardado()
    if (guardado.materias && guardado.obtenidoEn !== null
      && (estado.obtenidoEn === null || guardado.obtenidoEn > estado.obtenidoEn)) {
      publicar({ ...guardado, error: null })
    }
  }

  return {
    obtenerEstado: () => estado,
    suscribir(notificar: () => void) {
      oyentes.add(notificar)
      return () => { oyentes.delete(notificar) }
    },
    estaVencido,
    cargar,
    revalidarSiFalta,
    sincronizarDesdeAlmacenamiento,
  }
}

function obtenerAlmacenamiento() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export const catalogoMaterias = crearCatalogoMaterias({
  consultar: () => obtenerMaterias(),
  ahora: () => Date.now(),
  almacenamiento: obtenerAlmacenamiento(),
})
