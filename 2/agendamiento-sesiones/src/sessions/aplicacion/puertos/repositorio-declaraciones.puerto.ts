import type { DeclaracionCierre } from '../../dominio/entidades/declaracion-cierre';

export interface RepositorioDeclaraciones {
  registrarSiNoExiste(
    declaracion: Omit<
      DeclaracionCierre,
      'id_declaracion' | 'fecha_declaracion'
    >,
  ): Promise<boolean>;
  consultarPorSesion(idSesion: bigint): Promise<DeclaracionCierre[]>;
}
