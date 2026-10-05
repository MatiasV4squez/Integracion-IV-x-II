import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service.js';
import { ReportesController } from './reportes.controller.js';
import { ValidarSesionParaReporteGuard } from './guards/validar-sesion-para-reporte.guard.js';
import { HttpSesionesReporteValidator } from './infrastructure/http-sesiones-reporte-validator.js';
import { SESIONES_REPORTE_VALIDATOR } from './ports/sesiones-reporte-validator.js';
import { HttpUsuariosAuthClient } from './infrastructure/http-usuarios-auth-client.js';
import { ModeracionUsuariosAuthService } from './moderacion-usuarios-auth.service.js';
import { USUARIOS_AUTH_CLIENT } from './ports/usuarios-auth-client.js';

@Module({
  controllers: [ReportesController],
  providers: [
    ReportesService,
    ValidarSesionParaReporteGuard,
    {
      provide: SESIONES_REPORTE_VALIDATOR,
      useClass: HttpSesionesReporteValidator,
    },
    ModeracionUsuariosAuthService,
    {
      provide: USUARIOS_AUTH_CLIENT,
      useClass: HttpUsuariosAuthClient,
    },
  ],
})
export class ReportesModule {}
