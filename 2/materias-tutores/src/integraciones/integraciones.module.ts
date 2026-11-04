import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module.js';
import { IntegracionSecretGuard } from '../auth/integracion-secret.guard.js';
import { IntegracionesController } from './infraestructura/http/integraciones.controller.js';
import { CambiarEstadoBloqueUseCase } from './aplicacion/cambiar-estado-bloque.use-case.js';
import { BLOQUES_INTEGRACION_REPOSITORY, type BloquesIntegracionRepository } from './aplicacion/puertos/bloques-integracion.repository.js';
import { PrismaBloquesIntegracionRepository } from './infraestructura/prisma-bloques-integracion.repository.js';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [IntegracionesController],
  providers: [
    IntegracionSecretGuard,
    { provide: BLOQUES_INTEGRACION_REPOSITORY, useClass: PrismaBloquesIntegracionRepository },
    {
      provide: CambiarEstadoBloqueUseCase,
      inject: [BLOQUES_INTEGRACION_REPOSITORY],
      useFactory: (bloques: BloquesIntegracionRepository) => new CambiarEstadoBloqueUseCase(bloques),
    },
  ],
})
export class IntegracionesModule {}
