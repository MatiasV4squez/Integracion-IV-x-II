import { Module } from '@nestjs/common';
import { ReportesController } from './infraestructura/http/reportes.controller.js';
import { ValidarSesionParaReporteGuard } from './infraestructura/http/guards/validar-sesion-para-reporte.guard.js';
import { AdminJwtGuard } from './infraestructura/http/guards/admin-jwt.guard.js';
import { PrismaService } from './infraestructura/persistencia/prisma.service.js';
import { PrismaReporteRepository } from './infraestructura/persistencia/prisma-reporte.repository.js';
import { PrismaReporteConsultaRepository } from './infraestructura/persistencia/prisma-reporte-consulta.repository.js';
import { HttpSesionesReporteValidator } from './infraestructura/clientes/http-sesiones-reporte-validator.js';
import { HttpUsuariosAuthClient } from './infraestructura/clientes/http-usuarios-auth-client.js';
import {
  REPORTE_REPOSITORY,
} from './dominio/ports/reporte.repository.js';
import {
  REPORTE_CONSULTA_REPOSITORY,
} from './dominio/ports/reporte-consulta.repository.js';
import { SESIONES_REPORTE_VALIDATOR } from './dominio/ports/sesiones-reporte-validator.js';
import { USUARIOS_AUTH_CLIENT } from './dominio/ports/usuarios-auth-client.js';
import { ModeracionUsuariosAuthService } from './aplicacion/moderacion-usuarios-auth.service.js';
import { CrearReporteUseCase } from './aplicacion/crear-reporte.use-case.js';
import { ResolverReporteUseCase } from './aplicacion/resolver-reporte.use-case.js';
import { ReactivarSuspensionUseCase } from './aplicacion/reactivar-suspension.use-case.js';
import { ConsultarReportesAdminUseCase } from './aplicacion/consultar-reportes-admin.use-case.js';

@Module({
  controllers: [ReportesController],
  providers: [
    PrismaService,
    {
      provide: REPORTE_REPOSITORY,
      useClass: PrismaReporteRepository,
    },
    {
      provide: REPORTE_CONSULTA_REPOSITORY,
      useClass: PrismaReporteConsultaRepository,
    },
    {
      provide: SESIONES_REPORTE_VALIDATOR,
      useClass: HttpSesionesReporteValidator,
    },
    {
      provide: USUARIOS_AUTH_CLIENT,
      useClass: HttpUsuariosAuthClient,
    },
    ModeracionUsuariosAuthService,
    CrearReporteUseCase,
    ResolverReporteUseCase,
    ReactivarSuspensionUseCase,
    ConsultarReportesAdminUseCase,
    ValidarSesionParaReporteGuard,
    AdminJwtGuard,
  ],
})
export class ReportesModule {}
