import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateReporteDto } from './dto/create-reporte.dto.js';
import { ConsultaReportesAdminDto } from './dto/consulta-reportes-admin.dto.js';
import { ResolverReporteDto } from './dto/resolver-reporte.dto.js';
import { ValidarSesionParaReporteGuard } from './guards/validar-sesion-para-reporte.guard.js';
import {
  AdminJwtGuard,
  usuarioActual,
  type RequestConUsuario,
} from './guards/admin-jwt.guard.js';
import { CrearReporteUseCase } from '../../aplicacion/crear-reporte.use-case.js';
import { ConsultarReportesAdminUseCase } from '../../aplicacion/consultar-reportes-admin.use-case.js';
import { ResolverReporteUseCase } from '../../aplicacion/resolver-reporte.use-case.js';
import { ReactivarSuspensionUseCase } from '../../aplicacion/reactivar-suspension.use-case.js';

@Controller('reportes')
export class ReportesController {
  constructor(
    private readonly crearReporte: CrearReporteUseCase,
    private readonly consultarReportesAdmin: ConsultarReportesAdminUseCase,
    private readonly resolverReporte: ResolverReporteUseCase,
    private readonly reactivarSuspension: ReactivarSuspensionUseCase,
  ) {}

  @Post()
  @UseGuards(ValidarSesionParaReporteGuard)
  create(@Body() createReporteDto: CreateReporteDto) {
    return this.crearReporte.ejecutar(createReporteDto);
  }

  @Get('admin')
  @UseGuards(AdminJwtGuard)
  consultarParaAdmin(@Query() filtros: ConsultaReportesAdminDto) {
    return this.consultarReportesAdmin.ejecutar(filtros);
  }

  @Patch(':id/resolucion')
  @UseGuards(AdminJwtGuard)
  resolver(
    @Param('id') id: string,
    @Body() resolverReporteDto: ResolverReporteDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.resolverReporte.ejecutar(
      +id,
      resolverReporteDto,
      usuarioActual(request).sub,
    );
  }

  @Patch(':id/reactivacion')
  @UseGuards(AdminJwtGuard)
  reactivar(@Param('id') id: string, @Req() request: RequestConUsuario) {
    return this.reactivarSuspension.ejecutar(+id, usuarioActual(request).sub);
  }
}
