import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service.js';
import { ReportesController } from './reportes.controller.js';
import { ValidarSesionParaReporteGuard } from './guards/validar-sesion-para-reporte.guard.js';
import { HttpSesionesReporteValidator } from './infrastructure/http-sesiones-reporte-validator.js';
import { SESIONES_REPORTE_VALIDATOR } from './ports/sesiones-reporte-validator.js';

@Module({
  controllers: [ReportesController],
  providers: [
    ReportesService,
    ValidarSesionParaReporteGuard,
    {
      provide: SESIONES_REPORTE_VALIDATOR,
      useClass: HttpSesionesReporteValidator,
    },
  ],
})
export class ReportesModule {}
