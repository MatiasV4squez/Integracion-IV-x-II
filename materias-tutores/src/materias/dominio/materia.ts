// Datos del catálogo; independiente de su representación en PostgreSQL o HTTP.
export interface Materia {
  idMateria: bigint;
  codigo: string;
  nombre: string;
}
