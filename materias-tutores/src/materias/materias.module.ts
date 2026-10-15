import { Module } from '@nestjs/common';
import { MateriasController } from './infraestructura/http/materias.controller.js';
import { ListarMateriasUseCase } from './aplicacion/listar-materias.use-case.js';
import { MATERIAS_REPOSITORY, type MateriasRepository } from './aplicacion/puertos/materias.repository.js';
import { PrismaMateriasRepository } from './infraestructura/prisma-materias.repository.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [MateriasController],
  providers: [
    { provide: MATERIAS_REPOSITORY, useClass: PrismaMateriasRepository },
    {
      provide: ListarMateriasUseCase,
      inject: [MATERIAS_REPOSITORY],
      useFactory: (repositorio: MateriasRepository) => new ListarMateriasUseCase(repositorio),
    },
  ],
})
export class MateriasModule {}
