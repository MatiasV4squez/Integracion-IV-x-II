import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_IDLE_TIMEOUT_SECONDS,
  SESSION_REPOSITORY,
  type NuevaSesion,
  type SessionRepository,
} from '../dominio/auth.ports';

@Injectable()
export class SessionService {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sesiones: SessionRepository,
    @Inject(SESSION_IDLE_TIMEOUT_SECONDS)
    private readonly inactividadMaximaSegundos: number,
  ) {}

  crear(sesion: NuevaSesion): Promise<boolean> {
    return this.sesiones.crearSiCuentaActiva(sesion);
  }

  registrarActividad(idUsuario: string, jti: string): Promise<boolean> {
    const ahora = new Date();
    const limiteInactividad = new Date(
      ahora.getTime() - this.inactividadMaximaSegundos * 1000,
    );
    return this.sesiones.registrarActividad({
      idUsuario: BigInt(idUsuario),
      jti,
      ahora,
      limiteInactividad,
    });
  }

  revocar(idUsuario: string, jti: string): Promise<void> {
    return this.sesiones.revocar(BigInt(idUsuario), jti);
  }
}
