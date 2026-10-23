import { Inject, Injectable } from '@nestjs/common';
import type { Reporte } from '../dominio/reporte.js';
import {
  REPORTE_REPOSITORY,
  type ReporteRepository,
} from '../dominio/ports/reporte.repository.js';
import { payloadInvalido } from './errores.js';
import { requerirIdEntidad } from './validaciones.js';

export interface SolicitudCrearReporte {
  titulo: string;
  descripcion: string;
  id_sesion: string | number;
  id_usuario_reportador: string | number;
  id_usuario_reportado: string | number;
}

@Injectable()
export class CrearReporteUseCase {
  constructor(
    @Inject(REPORTE_REPOSITORY)
    private readonly reportes: ReporteRepository,
  ) {}

  async ejecutar(solicitud: SolicitudCrearReporte): Promise<Reporte> {
    const idSesion = requerirIdEntidad(solicitud.id_sesion, 'id_sesion');
    const usuarioReportadorId = requerirIdEntidad(
      solicitud.id_usuario_reportador,
      'id_usuario_reportador',
    );
    const usuarioReportadoId = requerirIdEntidad(
      solicitud.id_usuario_reportado,
      'id_usuario_reportado',
    );

    if (usuarioReportadorId === usuarioReportadoId) {
      throw payloadInvalido(
        'id_usuario_reportado debe ser distinto de id_usuario_reportador.',
      );
    }

    return this.reportes.crear({
      titulo: solicitud.titulo,
      descripcion: solicitud.descripcion,
      idSesion,
      usuarioReportadorId,
      usuarioReportadoId,
    });
  }
}
