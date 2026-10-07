import { Module } from '@nestjs/common';
import { TutoresController } from './tutores.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { BuscarTutoresPorMateriaUseCase } from './application/buscar-tutores-por-materia.use-case.js';
import { TUTORES_REPOSITORY, type TutoresRepository } from './application/ports/tutores.repository.js';
import { PrismaTutoresRepository } from './infrastructure/prisma-tutores.repository.js';
import { DisponibilidadModule } from '../disponibilidad/disponibilidad.module.js';
import { DisponibilidadTutoresAdapter } from './infrastructure/disponibilidad-tutores.adapter.js';
import { DISPONIBILIDAD_TUTORES, type DisponibilidadTutoresPort } from './application/ports/disponibilidad-tutores.port.js';

@Module({
  imports: [DatabaseModule, DisponibilidadModule],
  controllers: [TutoresController],
  providers: [
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
