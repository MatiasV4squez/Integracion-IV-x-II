import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { GestionarSesiones } from '../aplicacion/casos-de-uso/gestionar-sesiones';
import { ProcesarSesiones } from '../aplicacion/casos-de-uso/procesar-sesiones';
import { EntregarReputacion } from '../aplicacion/casos-de-uso/entregar-reputacion';
import { LiberarBloques } from '../aplicacion/casos-de-uso/liberar-bloques';
import { EntregarAvisosModeracion } from '../aplicacion/casos-de-uso/entregar-avisos-moderacion';
import type { ContextoTransaccion } from '../aplicacion/puertos/unidad-de-trabajo.puerto';
import { SessionsController } from './http/sessions.controller';
import { SesionesCron } from './tareas/sesiones-cron';
import { ReputacionHttp } from './integraciones/reputacion-http';
import { ModeracionHttp } from './integraciones/moderacion-http';
import { DisponibilidadTutoresHttp } from './integraciones/disponibilidad-tutores-http';
import { crearRepositoriosPrisma, UnidadDeTrabajoPrisma } from './persistencia/unidad-de-trabajo-prisma';

const REPOSITORIOS_SESIONES = Symbol('REPOSITORIOS_SESIONES');
const RELOJ = { ahora: () => new Date() };

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule],
  controllers: [SessionsController],
  providers: [
    {
      provide: REPOSITORIOS_SESIONES,
      inject: [PrismaService],
      useFactory: crearRepositoriosPrisma,
    },
    {
      provide: UnidadDeTrabajoPrisma,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new UnidadDeTrabajoPrisma(prisma),
    },
    ReputacionHttp,
    ModeracionHttp,
    DisponibilidadTutoresHttp,
    {
      provide: LiberarBloques,
      inject: [REPOSITORIOS_SESIONES, DisponibilidadTutoresHttp],
      useFactory: (
        repositorios: ContextoTransaccion,
        disponibilidad: DisponibilidadTutoresHttp,
      ) =>
        new LiberarBloques(
          repositorios.liberaciones,
          repositorios.sesiones,
          disponibilidad,
          RELOJ,
          new Logger(LiberarBloques.name),
        ),
    },
    {
      provide: EntregarReputacion,
      inject: [REPOSITORIOS_SESIONES, ReputacionHttp],
      useFactory: (
        repositorios: ContextoTransaccion,
        publicador: ReputacionHttp,
      ) => new EntregarReputacion(repositorios.entregas, publicador, RELOJ),
    },
    {
      provide: EntregarAvisosModeracion,
      inject: [REPOSITORIOS_SESIONES, ModeracionHttp],
      useFactory: (
        repositorios: ContextoTransaccion,
        publicador: ModeracionHttp,
      ) =>
        new EntregarAvisosModeracion(
          repositorios.avisosModeracion,
          publicador,
          RELOJ,
          new Logger(EntregarAvisosModeracion.name),
        ),
    },
    {
      provide: GestionarSesiones,
      inject: [
        UnidadDeTrabajoPrisma,
        REPOSITORIOS_SESIONES,
        EntregarReputacion,
        DisponibilidadTutoresHttp,
        LiberarBloques,
        EntregarAvisosModeracion,
      ],
      useFactory: (
        unidad: UnidadDeTrabajoPrisma,
        repositorios: ContextoTransaccion,
        reputacion: EntregarReputacion,
        disponibilidad: DisponibilidadTutoresHttp,
        liberaciones: LiberarBloques,
        avisosModeracion: EntregarAvisosModeracion,
      ) =>
        new GestionarSesiones(
          unidad,
          repositorios.sesiones,
          repositorios.calificaciones,
          reputacion,
          new Logger(GestionarSesiones.name),
          disponibilidad,
          liberaciones,
          avisosModeracion,
        ),
    },
    {
      provide: ProcesarSesiones,
      inject: [UnidadDeTrabajoPrisma, REPOSITORIOS_SESIONES, LiberarBloques],
      useFactory: (
        unidad: UnidadDeTrabajoPrisma,
        repositorios: ContextoTransaccion,
        liberaciones: LiberarBloques,
      ) =>
        new ProcesarSesiones(
          unidad,
          repositorios.sesiones,
          RELOJ,
          new Logger(ProcesarSesiones.name),
          liberaciones,
        ),
    },
    SesionesCron,
  ],
})
export class SessionsModule {}
