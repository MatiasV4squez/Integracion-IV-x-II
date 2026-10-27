export interface HorarioDisponibilidad{
    dia: string
    horaInicio: string
    horaFin: string
}

export interface BloqueDisponibilidad extends HorarioDisponibilidad{
    idBloque: string
    estadoBloque: 'DISPONIBLE'|'RESERVADO'|'INACTIVO'
}

export type CambiosDisponibilidad = Partial<HorarioDisponibilidad>

export type ConsultaDisponibilidad =
  | { estado: 'cargando' }
  | { estado: 'listo'; bloques: BloqueDisponibilidad[] }
  | { estado: 'error'; mensaje: string }