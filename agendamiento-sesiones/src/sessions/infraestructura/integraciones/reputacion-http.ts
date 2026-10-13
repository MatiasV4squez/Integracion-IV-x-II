import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PublicadorReputacion } from '../../aplicacion/puertos/publicador-reputacion.puerto';
import type { Calificacion } from '../../dominio/entidades/calificacion';

@Injectable()
export class ReputacionHttp implements PublicadorReputacion {
  private readonly registro = new Logger(ReputacionHttp.name);
  private configuracionAdvertida = false;

  constructor(private readonly configuracion: ConfigService) {}

  estaConfigurado(): boolean {
    return this.obtenerDestino() !== null;
  }

  async publicar(calificacion: Calificacion): Promise<boolean> {
    const destino = this.obtenerDestino();
    if (!destino) return false;
    const url = new URL(
      `/integraciones/tutores/${calificacion.id_evaluado}/calificaciones`,
      destino.base,
    );
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Integracion-Secret': destino.secreto,
        },
        body: JSON.stringify({
          idCalificacion: calificacion.id_calificacion.toString(),
          puntuacion: calificacion.puntuacion,
          rolEvaluado: 'TUTOR',
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(3000),
      });
      if (!respuesta.ok)
        this.registro.warn(
          `Materias-tutores rechazó la calificación ${calificacion.id_calificacion} (HTTP ${respuesta.status}).`,
        );
      return respuesta.ok;
    } catch {
      this.registro.warn(
        `No se pudo entregar la calificación ${calificacion.id_calificacion}; se reintentará.`,
      );
      return false;
    }
  }

  private obtenerDestino(): { base: URL; secreto: string } | null {
    const base = this.configuracion.get<string>('MATERIAS_TUTORES_URL');
    const secreto = this.configuracion.get<string>('INTEGRACION_SECRET');
    let url: URL | undefined;
    try {
      if (base) url = new URL(base);
    } catch {
      url = undefined;
    }
    if (
      !url ||
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !secreto ||
      Buffer.byteLength(secreto) < 32
    ) {
      if (!this.configuracionAdvertida) {
        this.registro.warn(
          'Configura MATERIAS_TUTORES_URL e INTEGRACION_SECRET para sincronizar reputación.',
        );
        this.configuracionAdvertida = true;
      }
      return null;
    }
    this.configuracionAdvertida = false;
    return { base: url, secreto };
  }
}
