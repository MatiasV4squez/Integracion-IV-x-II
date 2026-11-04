import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PublicadorModeracion } from '../../aplicacion/puertos/publicador-moderacion.puerto';
import type { AvisoModeracion } from '../../aplicacion/contratos/avisos-moderacion';

@Injectable()
export class ModeracionHttp implements PublicadorModeracion {
  private readonly registro = new Logger(ModeracionHttp.name);
  private configuracionAdvertida = false;

  constructor(private readonly configuracion: ConfigService) {}

  estaConfigurado(): boolean {
    return this.obtenerDestino() !== null;
  }

  async publicar(aviso: AvisoModeracion): Promise<boolean> {
    const destino = this.obtenerDestino();
    if (!destino) return false;
    const ruta =
      aviso.contenido.tipo === 'CONFLICTO_DETECTADO'
        ? '/integraciones/sesiones/conflictos'
        : '/integraciones/sesiones/resoluciones';
    try {
      const respuesta = await fetch(new URL(ruta, destino.base), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Integracion-Secret': destino.secreto,
          'Idempotency-Key': `agendamiento-sesiones:moderacion:${aviso.id_aviso}`,
        },
        body: JSON.stringify({
          origen: 'agendamiento-sesiones',
          version: 1,
          id_aviso: aviso.id_aviso.toString(),
          fecha_aviso: aviso.fecha_creacion.toISOString(),
          ...aviso.contenido,
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(3000),
      });
      if (!respuesta.ok)
        this.registro.warn(
          `Reportes/moderación rechazó el aviso ${aviso.id_aviso} (HTTP ${respuesta.status}).`,
        );
      return respuesta.ok;
    } catch {
      this.registro.warn(
        `No se pudo entregar el aviso ${aviso.id_aviso} a reportes/moderación; se reintentará.`,
      );
      return false;
    }
  }

  private obtenerDestino(): { base: URL; secreto: string } | null {
    const base = this.configuracion.get<string>('REPORTES_MODERACION_URL');
    const secreto = this.configuracion.get<string>(
      'MODERACION_INTEGRACION_SECRET',
    );
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
          'Configura REPORTES_MODERACION_URL y MODERACION_INTEGRACION_SECRET para entregar los avisos de sesiones.',
        );
        this.configuracionAdvertida = true;
      }
      return null;
    }
    this.configuracionAdvertida = false;
    return { base: url, secreto };
  }
}
