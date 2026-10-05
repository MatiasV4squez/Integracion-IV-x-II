import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReputacionIntegracionService {
  private readonly logger = new Logger(ReputacionIntegracionService.name);
  private configuracionAdvertida = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracion: ConfigService,
  ) {}

  async enviarCalificacion(idCalificacion: bigint): Promise<boolean> {
    const destino = this.obtenerDestino();
    if (!destino) return false;

    const entrega = await this.prisma.entrega_reputacion_tutor.findUnique({
      where: { id_calificacion: idCalificacion },
      include: { calificacion: true },
    });
    if (!entrega || entrega.fecha_entrega) return false;

    const url = new URL(
      `/integraciones/tutores/${entrega.calificacion.id_evaluado}/calificaciones`,
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
          idCalificacion: idCalificacion.toString(),
          puntuacion: entrega.calificacion.puntuacion,
          rolEvaluado: 'TUTOR',
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(3000),
      });
      if (!respuesta.ok) {
        this.logger.warn(
          `Materias-tutores rechazó la calificación ${idCalificacion} (HTTP ${respuesta.status}).`,
        );
        await this.registrarIntento(idCalificacion);
        return false;
      }
      await this.registrarIntento(idCalificacion, new Date());
      return true;
    } catch {
      this.logger.warn(
        `No se pudo entregar la calificación ${idCalificacion}; se reintentará.`,
      );
      await this.registrarIntento(idCalificacion);
      return false;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  async reenviarPendientes(): Promise<void> {
    if (!this.obtenerDestino()) return;
    const pendientes = await this.prisma.entrega_reputacion_tutor.findMany({
      where: { fecha_entrega: null },
      orderBy: [{ intentos: 'asc' }, { fecha_creacion: 'asc' }],
      take: 10,
      select: { id_calificacion: true },
    });
    for (const pendiente of pendientes) {
      await this.enviarCalificacion(pendiente.id_calificacion);
    }
  }

  private async registrarIntento(idCalificacion: bigint, fechaEntrega?: Date) {
    await this.prisma.entrega_reputacion_tutor.updateMany({
      where: { id_calificacion: idCalificacion, fecha_entrega: null },
      data: {
        intentos: { increment: 1 },
        ...(fechaEntrega ? { fecha_entrega: fechaEntrega } : {}),
      },
    });
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
        this.logger.warn(
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
