import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthenticatedJwtGuard } from '../auth/authenticated-jwt.guard.js';
import { IntegracionSecretGuard } from '../auth/integracion-secret.guard.js';
import { ConsultaTutoresGuard } from '../auth/consulta-tutores.guard.js';
import { TutoresController } from './infraestructura/http/tutores.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { BuscarTutoresPorMateriaUseCase } from './aplicacion/buscar-tutores-por-materia.use-case.js';
import { TUTORES_REPOSITORY, type TutoresRepository } from './aplicacion/puertos/tutores.repository.js';
import { PrismaTutoresRepository } from './infraestructura/prisma-tutores.repository.js';
import { DisponibilidadModule } from '../disponibilidad/disponibilidad.module.js';
import { DisponibilidadTutoresAdapter } from './infraestructura/disponibilidad-tutores.adapter.js';
import { DISPONIBILIDAD_TUTORES, type DisponibilidadTutoresPort } from './aplicacion/puertos/disponibilidad-tutores.port.js';

@Module({
  imports: [DatabaseModule, DisponibilidadModule, ConfigModule, JwtModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET') }),
  })],
  controllers: [TutoresController],
  providers: [
    AuthenticatedJwtGuard,
    IntegracionSecretGuard,
    ConsultaTutoresGuard,
    {
      provide: TUTORES_REPOSITORY,
      useClass: PrismaTutoresRepository,
    },
    {
      provide: DISPONIBILIDAD_TUTORES,
      useClass: DisponibilidadTutoresAdapter,
    },
    {
      provide: BuscarTutoresPorMateriaUseCase,
      inject: [TUTORES_REPOSITORY, DISPONIBILIDAD_TUTORES],
      useFactory: (repositorio: TutoresRepository, disponibilidad: DisponibilidadTutoresPort) => new BuscarTutoresPorMateriaUseCase(repositorio, disponibilidad),
    },
  ],
})
export class TutoresModule {}
