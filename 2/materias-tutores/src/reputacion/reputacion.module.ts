import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module.js';
import { AuthenticatedJwtGuard } from '../auth/authenticated-jwt.guard.js';
import { IntegracionSecretGuard } from '../auth/integracion-secret.guard.js';
import { RegistrarCalificacionUseCase } from './aplicacion/registrar-calificacion.use-case.js';
import { ConsultarReputacionUseCase } from './aplicacion/consultar-reputacion.use-case.js';
import { REPUTACION_REPOSITORY, type ReputacionRepository } from './aplicacion/puertos/reputacion.repository.js';
import { PrismaReputacionRepository } from './infraestructura/prisma-reputacion.repository.js';
import { CalificacionesController } from './infraestructura/http/calificaciones.controller.js';
import { ReputacionController } from './infraestructura/http/reputacion.controller.js';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET') }),
    }),
  ],
  controllers: [CalificacionesController, ReputacionController],
  providers: [
    AuthenticatedJwtGuard,
    IntegracionSecretGuard,
    { provide: REPUTACION_REPOSITORY, useClass: PrismaReputacionRepository },
    { provide: RegistrarCalificacionUseCase, inject: [REPUTACION_REPOSITORY], useFactory: (repositorio: ReputacionRepository) => new RegistrarCalificacionUseCase(repositorio) },
    { provide: ConsultarReputacionUseCase, inject: [REPUTACION_REPOSITORY], useFactory: (repositorio: ReputacionRepository) => new ConsultarReputacionUseCase(repositorio) },
  ],
})
export class ReputacionModule {}
