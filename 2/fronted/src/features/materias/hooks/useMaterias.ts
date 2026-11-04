import { useEffect, useSyncExternalStore } from 'react'
import { catalogoMaterias } from '../aplicacion/catalogo-materias'
import type { Materia } from '../models/materia'

type ConsultaMaterias =
  | { estado: 'cargando' }
  | { estado: 'listo'; materias: Materia[] }
  | { estado: 'error'; mensaje: string }

function suscribir(notificar: () => void) {
  const cancelar = catalogoMaterias.suscribir(notificar)
  // Al volver a la pestaña solo se consulta si los datos vencieron.
  const alVolver = () => {
    if (document.visibilityState === 'visible') void catalogoMaterias.cargar()
  }
  const alCambiarAlmacenamiento = (evento: StorageEvent) => {
    if (evento.key === null || evento.key.startsWith('stp:catalogo-materias')) catalogoMaterias.sincronizarDesdeAlmacenamiento()
  }
  document.addEventListener('visibilitychange', alVolver)
  window.addEventListener('storage', alCambiarAlmacenamiento)
  return () => {
    cancelar()
    document.removeEventListener('visibilitychange', alVolver)
    window.removeEventListener('storage', alCambiarAlmacenamiento)
  }
}

// Funciones estables: pueden usarse como dependencias de efectos sin repetirlos en cada render.
const recargar = () => { void catalogoMaterias.cargar({ forzar: true }) }
const revalidarSiFalta = (idMateria: string) => { void catalogoMaterias.revalidarSiFalta(idMateria) }

export function useMaterias() {
  const estado = useSyncExternalStore(suscribir, catalogoMaterias.obtenerEstado, catalogoMaterias.obtenerEstado)

  useEffect(() => { void catalogoMaterias.cargar() }, [])

  // Con datos previos se siguen mostrando mientras se actualizan o si la actualización falla.
  const consulta: ConsultaMaterias = estado.materias !== null
    ? { estado: 'listo', materias: estado.materias }
    : estado.error !== null && !estado.actualizando
      ? { estado: 'error', mensaje: estado.error }
      : { estado: 'cargando' }

  return {
    consulta,
    actualizando: estado.actualizando && estado.materias !== null,
    errorActualizacion: estado.materias !== null ? estado.error : null,
    obtenidoEn: estado.obtenidoEn,
    recargar,
    revalidarSiFalta,
  }
}
