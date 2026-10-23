import { Inject, Injectable } from '@nestjs/common';
import { puedeReactivarse, type Reporte } from '../dominio/reporte.js';
import {
  REPORTE_REPOSITORY,
  type ReporteRepository,
} from '../dominio/ports/reporte.repository.js';
import { reactivacionInvalida, reporteNoEncontrado } from './errores.js';
import { requerirIdEntidad, requerirIdReporte } from './validaciones.js';
import { ModeracionUsuariosAuthService } from './moderacion-usuarios-auth.service.js';

@Injectable()
export class ReactivarSuspensionUseCase {
  constructor(
    @Inject(REPORTE_REPOSITORY)
    private readonly reportes: ReporteRepository,
    private readonly moderacion: ModeracionUsuariosAuthService,
  ) {}

  async ejecutar(id: number, administradorId: string): Promise<Reporte> {
    const reporteId = requerirIdReporte(id);

    const reporte = await this.reportes.buscarPorId(reporteId);
    if (!reporte) throw reporteNoEncontrado();
    if (!puedeReactivarse(reporte)) throw reactivacionInvalida();

    await this.moderacion.reactivarUsuario(String(reporte.usuarioReportadoId));

    return this.reportes.reactivar(reporteId, {
      reactivadoPorId: requerirIdEntidad(administradorId, 'administrador'),
      reactivadoEn: new Date(),
    });
  }
}
