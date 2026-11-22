import type { Sesion } from '../models/sesion'
import { ETIQUETAS_SESION } from '../utils/filtros-tutorias'

export function EstadoTutoria({ estado }: { estado: Sesion['estado_sesion'] }) {
  return <span className={'tutorias__insignia tutorias__insignia--' + estado.toLowerCase()}>{ETIQUETAS_SESION[estado]}</span>
}
