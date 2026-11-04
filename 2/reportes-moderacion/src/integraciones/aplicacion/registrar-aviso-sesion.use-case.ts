import { Inject, Injectable } from '@nestjs/common';
import {
  TIPO_CONFLICTO_DETECTADO,
  type TipoAvisoSesion,
} from '../dominio/aviso-sesion.js';
import {
  AVISO_SESION_REPOSITORY,
  type AvisoSesionRepository,
} from '../dominio/ports/aviso-sesion.repository.js';
import {
  validarAvisoConflicto,
  validarAvisoResolucion,
} from './validaciones.js';

export interface ResultadoRegistroAvisoSesion {
  id_aviso: string;
  duplicado: boolean;
}

@Injectable()
export class RegistrarAvisoSesionUseCase {
  constructor(
    @Inject(AVISO_SESION_REPOSITORY)
    private readonly avisos: AvisoSesionRepository,
  ) {}

  async ejecutar(
    aviso: unknown,
    tipoEsperado: TipoAvisoSesion,
  ): Promise<ResultadoRegistroAvisoSesion> {
    const datos =
      tipoEsperado === TIPO_CONFLICTO_DETECTADO
        ? validarAvisoConflicto(aviso)
        : validarAvisoResolucion(aviso);

    const { duplicado } = await this.avisos.registrar(datos);

    return { id_aviso: datos.idAviso, duplicado };
  }
}
