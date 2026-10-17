import type { EstadoDisponibilidad } from '../../dominio/tipos/estado-disponibilidad';

export interface EntradaCrearDisponibilidad {
  dia: string; // YYYY-MM-DD (America/Santiago)
  hora_inicio: string; // HH:MM (America/Santiago)
  hora_fin: string; // HH:MM (America/Santiago)
}

export interface EntradaEditarDisponibilidad {
  hora_inicio?: string; // HH:MM (America/Santiago)
  hora_fin?: string; // HH:MM (America/Santiago)
  estado?: EstadoDisponibilidad;
}

export interface ConsultarDisponibilidadFiltros {
  estado?: EstadoDisponibilidad;
  dia?: string; // YYYY-MM-DD (America/Santiago)
}
