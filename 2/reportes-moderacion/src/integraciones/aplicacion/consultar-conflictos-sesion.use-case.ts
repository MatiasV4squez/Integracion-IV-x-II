import { Inject, Injectable } from '@nestjs/common';
import {
  CONFLICTO_SESION_CONSULTA_REPOSITORY,
  type ConflictoSesionConsultaRepository,
  type ConflictoSesionPendiente,
} from '../dominio/ports/conflicto-sesion-consulta.repository.js';

@Injectable()
export class ConsultarConflictosSesionUseCase {
  constructor(
    @Inject(CONFLICTO_SESION_CONSULTA_REPOSITORY)
    private readonly consulta: ConflictoSesionConsultaRepository,
  ) {}

  ejecutar(): Promise<ConflictoSesionPendiente[]> {
    return this.consulta.listarPendientes();
  }
}
