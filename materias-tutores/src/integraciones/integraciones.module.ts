import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module.js';
import { IntegracionSecretGuard } from '../auth/integracion-secret.guard.js';
import { IntegracionesController } from './integraciones.controller.js';
import { IntegracionesService } from './integraciones.service.js';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [IntegracionesController],
  providers: [IntegracionesService, IntegracionSecretGuard],
})
export class IntegracionesModule {}
