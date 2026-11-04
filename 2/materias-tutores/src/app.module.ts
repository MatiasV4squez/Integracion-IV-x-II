import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MateriasModule } from './materias/materias.module.js';
import { DisponibilidadModule } from './disponibilidad/disponibilidad.module.js';
import { PostulacionesModule } from './postulaciones/postulaciones.module.js';
import { IntegracionesModule } from './integraciones/integraciones.module.js';
import { ReputacionModule } from './reputacion/reputacion.module.js';
import { TutoresModule } from './tutores/tutores.module.js';

@Module({
  imports: [ConfigModule.forRoot({ validate: validateEnvironment }), DatabaseModule, MateriasModule, DisponibilidadModule, PostulacionesModule, IntegracionesModule, TutoresModule, ReputacionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
