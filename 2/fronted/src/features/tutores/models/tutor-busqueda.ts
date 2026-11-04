export interface HorarioDisponible {
  idBloque: string
  dia: string
  horaInicio: string
  horaFin: string
}

// Modelo de presentación: el nombre podrá completarse al integrar los perfiles.
export interface TutorBusqueda {
  idTutor: string
  nombre?: string
  promedioCalificaciones: number | null
  cantidadCalificaciones: number
  horariosDisponibles: HorarioDisponible[]
}
