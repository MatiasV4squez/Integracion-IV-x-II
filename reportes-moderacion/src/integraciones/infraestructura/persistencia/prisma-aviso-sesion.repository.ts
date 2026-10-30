import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AvisoSesion as AvisoSesionPrisma } from '@prisma/client';
import type {
  AvisoSesion,
  ContenidoAvisoSesion,
} from '../../dominio/aviso-sesion.js';
import type {
  AvisoSesionRepository,
  DatosNuevoAvisoSesion,
  ResultadoRegistroAviso,
} from '../../dominio/ports/aviso-sesion.repository.js';
import { PrismaService } from '../../../compartido/prisma.service.js';

@Injectable()
export class PrismaAvisoSesionRepository implements AvisoSesionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(
    datos: DatosNuevoAvisoSesion,
  ): Promise<ResultadoRegistroAviso> {
    const { datos: contenido, ...columnas } = datos;

    try {
      const creado = await this.prisma.avisoSesion.create({
        data: {
          ...columnas,
          datos: contenido as unknown as Prisma.InputJsonValue,
        },
      });
      return { aviso: this.aDominio(creado), duplicado: false };
    } catch (error) {
      if (this.esConflictoUnicidad(error)) {
        const existente = await this.prisma.avisoSesion.findUnique({
          where: { idAviso: datos.idAviso },
        });
        if (existente) {
          return { aviso: this.aDominio(existente), duplicado: true };
        }
      }
      throw error;
    }
  }

  private esConflictoUnicidad(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private aDominio(aviso: AvisoSesionPrisma): AvisoSesion {
    return {
      id: aviso.id,
      origen: aviso.origen,
      version: aviso.version,
      idAviso: aviso.idAviso,
      fechaAviso: aviso.fechaAviso,
      tipo: aviso.tipo,
      idSesion: aviso.idSesion,
      datos: aviso.datos as unknown as ContenidoAvisoSesion,
      creadoEn: aviso.creadoEn,
    };
  }
}
