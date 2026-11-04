import type { TutorBusqueda } from './tutor.busqueda.js';

export type ResultadoBusquedaTutores = {
  items: TutorBusqueda[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
