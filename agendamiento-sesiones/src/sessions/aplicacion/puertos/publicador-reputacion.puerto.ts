import type { Calificacion } from '../../dominio/entidades/calificacion';

export interface PublicadorReputacion {
  estaConfigurado(): boolean;
  publicar(calificacion: Calificacion): Promise<boolean>;
}
