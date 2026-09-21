import { Module } from '@nestjs/common';
import { MateriasController } from './materias.controller.js';
import { MateriasService } from './materias.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [MateriasController],
  providers: [MateriasService],
})
export class MateriasModule {}
