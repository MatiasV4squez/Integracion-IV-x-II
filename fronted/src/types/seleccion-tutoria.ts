export interface BloqueDisponible {
    idBloque: string;
    dia: string
    horaInicio: string;
    horaFin: string
}

export interface TutorDisponible {
    idTutor: string;
    promedioCalificaciones: number | null;
    cantidadCalificaciones: number;
    horariosDisponibles: BloqueDisponible[];
}

export interface SeleccionTutoria {
    id_materia: string;
    id_tutor: string;
    id_bloque: string;
}