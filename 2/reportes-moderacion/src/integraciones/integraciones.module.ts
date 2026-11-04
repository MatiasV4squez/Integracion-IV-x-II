import { Module } from '@nestjs/common';
import { PrismaModule } from '../compartido/prisma.module.js';
import { AvisosSesionController } from './infraestructura/http/avisos-sesion.controller.js';
import { IntegracionSecretGuard } from './infraestructura/http/integracion-secret.guard.js';
import { PrismaAvisoSesionRepository } from './infraestructura/persistencia/prisma-aviso-sesion.repository.js';
import { PrismaConflictoSesionConsultaRepository } from './infraestructura/persistencia/prisma-conflicto-sesion-consulta.repository.js';
import { AVISO_SESION_REPOSITORY } from './dominio/ports/aviso-sesion.repository.js';
import { CONFLICTO_SESION_CONSULTA_REPOSITORY } from './dominio/ports/conflicto-sesion-consulta.repository.js';
import { RegistrarAvisoSesionUseCase } from './aplicacion/registrar-aviso-sesion.use-case.js';
import { ConsultarConflictosSesionUseCase } from './aplicacion/consultar-conflictos-sesion.use-case.js';

@Module({
  imports: [PrismaModule],
  controllers: [AvisosSesionController],
  providers: [
    IntegracionSecretGuard,
    {
      provide: AVISO_SESION_REPOSITORY,
      useClass: PrismaAvisoSesionRepository,
    },
    {
      provide: CONFLICTO_SESION_CONSULTA_REPOSITORY,
      useClass: PrismaConflictoSesionConsultaRepository,
    },
    RegistrarAvisoSesionUseCase,
    ConsultarConflictosSesionUseCase,
  ],
  exports: [ConsultarConflictosSesionUseCase],
})
export class IntegracionesModule {}
