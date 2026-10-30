import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { IntegracionesModule } from './integraciones/integraciones.module.js';
import { ReportesModule } from './reportes/reportes.module.js';

@Module({
  imports: [IntegracionesModule, ReportesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
