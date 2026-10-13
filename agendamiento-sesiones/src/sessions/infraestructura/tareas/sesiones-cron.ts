import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProcesarSesiones } from '../../aplicacion/casos-de-uso/procesar-sesiones';
import { EntregarReputacion } from '../../aplicacion/casos-de-uso/entregar-reputacion';
import { LiberarBloques } from '../../aplicacion/casos-de-uso/liberar-bloques';
import { EntregarAvisosModeracion } from '../../aplicacion/casos-de-uso/entregar-avisos-moderacion';

@Injectable()
export class SesionesCron {
  constructor(
    private readonly sesiones: ProcesarSesiones,
    private readonly reputacion: EntregarReputacion,
    private readonly liberaciones: LiberarBloques,
    private readonly avisosModeracion: EntregarAvisosModeracion,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { waitForCompletion: true })
  expirarSolicitudes(): Promise<void> {
    return this.sesiones.expirarSolicitudes();
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  pasarAPendienteCierre(): Promise<void> {
    return this.sesiones.pasarAPendienteCierre();
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  resolverDeclaracionesVencidas(): Promise<void> {
    return this.sesiones.resolverDeclaracionesVencidas();
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  reenviarReputacionPendiente(): Promise<void> {
    return this.reputacion.reenviarPendientes();
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  reenviarLiberacionesPendientes(): Promise<void> {
    return this.liberaciones.reenviarPendientes();
  }

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  reenviarAvisosModeracionPendientes(): Promise<void> {
    return this.avisosModeracion.reenviarPendientes();
  }
}
