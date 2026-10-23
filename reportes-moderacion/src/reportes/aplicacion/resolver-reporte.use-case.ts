import { Inject, Injectable } from '@nestjs/common';
import {
  ESTADO_SUSPENDIDO,
  esResolucionValida,
  MAX_MOTIVO_LENGTH,
  puedeResolverse,
  type Reporte,
} from '../dominio/reporte.js';
import {
  REPORTE_REPOSITORY,
  type ReporteRepository,
} from '../dominio/ports/reporte.repository.js';
import {
  reporteNoEncontrado,
  reporteYaResuelto,
  resolucionInvalida,
} from './errores.js';
import { requerirIdEntidad, requerirIdReporte } from './validaciones.js';
import { ModeracionUsuariosAuthService } from './moderacion-usuarios-auth.service.js';

export interface SolicitudResolverReporte {
  estado: string;
  motivo?: string;
}

function normalizarMotivo(motivo: unknown): string | null {
  if (motivo === undefined) return null;
  if (typeof motivo !== 'string' || !motivo.trim()) {
    throw resolucionInvalida('motivo no puede estar vacío.');
  }
  const normalizado = motivo.trim();
  if (normalizado.length > MAX_MOTIVO_LENGTH) {
    throw resolucionInvalida(
      `motivo debe tener como máximo ${MAX_MOTIVO_LENGTH} caracteres.`,
    );
  }
  return normalizado;
}

@Injectable()
export class ResolverReporteUseCase {
  constructor(
    @Inject(REPORTE_REPOSITORY)
    private readonly reportes: ReporteRepository,
    private readonly moderacion: ModeracionUsuariosAuthService,
  ) {}

  async ejecutar(
    id: number,
    solicitud: SolicitudResolverReporte,
    administradorId: string,
  ): Promise<Reporte> {
    const reporteId = requerirIdReporte(id);

    const estado = solicitud.estado;
    if (typeof estado !== 'string' || !esResolucionValida(estado)) {
      throw resolucionInvalida(
        'estado debe ser DESESTIMADO, ADVERTIDO o SUSPENDIDO.',
      );
    }
    const motivo = normalizarMotivo(solicitud.motivo);

    const reporte = await this.reportes.buscarPorId(reporteId);
    if (!reporte) throw reporteNoEncontrado();
    if (!puedeResolverse(reporte)) throw reporteYaResuelto();

    if (estado === ESTADO_SUSPENDIDO) {
      await this.moderacion.suspenderUsuario(String(reporte.usuarioReportadoId));
    }

    return this.reportes.resolver(reporteId, {
      estado,
      motivo,
      resueltoPorId: requerirIdEntidad(administradorId, 'administrador'),
      resueltoEn: new Date(),
    });
  }
}
