import { Injectable } from '@nestjs/common';
import {
  TIPO_CONFLICTO_DETECTADO,
  TIPO_CONFLICTO_RESUELTO,
  type ContenidoConflictoSesion,
} from '../../dominio/aviso-sesion.js';
import type {
  ConflictoSesionConsultaRepository,
  ConflictoSesionPendiente,
} from '../../dominio/ports/conflicto-sesion-consulta.repository.js';
import { PrismaService } from '../../../compartido/prisma.service.js';

const MAX_CONFLICTOS = 100;

@Injectable()
export class PrismaConflictoSesionConsultaRepository
  implements ConflictoSesionConsultaRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async listarPendientes(): Promise<ConflictoSesionPendiente[]> {
    const resoluciones = await this.prisma.avisoSesion.findMany({
      where: { tipo: TIPO_CONFLICTO_RESUELTO },
      select: { idSesion: true },
    });
    const sesionesResueltas = resoluciones.map(
      (resolucion) => resolucion.idSesion,
    );

    const conflictos = await this.prisma.avisoSesion.findMany({
      where: {
        tipo: TIPO_CONFLICTO_DETECTADO,
        ...(sesionesResueltas.length > 0
          ? { idSesion: { notIn: sesionesResueltas } }
          : {}),
      },
      orderBy: [{ fechaAviso: 'desc' }, { id: 'desc' }],
      take: MAX_CONFLICTOS,
    });

    return conflictos.map((aviso) => ({
      id_aviso: aviso.idAviso,
      fecha_aviso: aviso.fechaAviso,
      id_sesion: aviso.idSesion,
      contenido: aviso.datos as unknown as ContenidoConflictoSesion,
    }));
  }
}
