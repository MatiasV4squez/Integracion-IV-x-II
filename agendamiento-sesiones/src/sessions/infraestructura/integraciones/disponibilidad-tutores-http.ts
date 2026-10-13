import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DisponibilidadTutores, BloqueDisponible } from '../../aplicacion/puertos/disponibilidad-tutores.puerto';
import { ErrorSesion } from '../../dominio/errores/error-sesion';
import { convertirHorarioBloque } from './horario-bloque';

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

@Injectable()
export class DisponibilidadTutoresHttp implements DisponibilidadTutores {
  constructor(private readonly configuracion: ConfigService) {}

  async consultarBloque(
    idTutor: bigint,
    idMateria: bigint,
    idBloque: bigint,
  ): Promise<BloqueDisponible> {
    const destino = this.obtenerDestino();
    const limiteEspera = AbortSignal.timeout(5000);
    let pagina = 1;
    let totalPaginas = 1;
    try {
      do {
        const url = new URL('/tutores', destino.base);
        url.searchParams.set('materiaId', idMateria.toString());
        url.searchParams.set('page', pagina.toString());
        url.searchParams.set('limit', '100');
        const respuesta = await this.solicitar(url, {
          method: 'GET',
          signal: limiteEspera,
        });
        const datos: unknown = await respuesta.json();
        let tutores: unknown[];
        if (Array.isArray(datos)) {
          // Compatibilidad con la búsqueda anterior, sin paginación.
          tutores = datos;
          totalPaginas = pagina;
        } else if (
          esObjeto(datos) &&
          Array.isArray(datos.items) &&
          Number.isSafeInteger(datos.totalPages) &&
          Number(datos.totalPages) >= 0 &&
          datos.page === pagina
        ) {
          tutores = datos.items;
          totalPaginas = Number(datos.totalPages);
        } else {
          throw new ErrorSesion(
            'DEPENDENCIA_NO_DISPONIBLE',
            'Materias-tutores devolvió una búsqueda inválida.',
          );
        }
        const tutor = tutores.find(
          (item) => esObjeto(item) && item.idTutor === idTutor.toString(),
        );
        if (esObjeto(tutor)) {
          if (!Array.isArray(tutor.horariosDisponibles)) {
            throw new ErrorSesion(
              'DEPENDENCIA_NO_DISPONIBLE',
              'Materias-tutores no devolvió los horarios del tutor.',
            );
          }
          const bloque = tutor.horariosDisponibles.find(
            (item: unknown) =>
              esObjeto(item) && item.idBloque === idBloque.toString(),
          );
          if (!esObjeto(bloque)) {
            throw new ErrorSesion(
              'CONFLICTO',
              'El bloque no está disponible para el tutor y la materia seleccionados.',
            );
          }
          if (
            typeof bloque.dia !== 'string' ||
            typeof bloque.horaInicio !== 'string' ||
            typeof bloque.horaFin !== 'string'
          ) {
            throw new ErrorSesion(
              'DEPENDENCIA_NO_DISPONIBLE',
              'Materias-tutores devolvió un bloque sin horario válido.',
            );
          }
          return {
            id_tutor: idTutor,
            id_bloque: idBloque,
            ...convertirHorarioBloque(
              bloque.dia,
              bloque.horaInicio,
              bloque.horaFin,
            ),
          };
        }
        pagina++;
      } while (pagina <= totalPaginas);
      throw new ErrorSesion(
        'CONFLICTO',
        'El tutor no está habilitado para la materia seleccionada.',
      );
    } catch (error: unknown) {
      if (error instanceof ErrorSesion) throw error;
      throw new ErrorSesion(
        'DEPENDENCIA_NO_DISPONIBLE',
        'No se pudo consultar la disponibilidad en materias-tutores.',
      );
    }
  }

  reservar(idBloque: bigint): Promise<void> {
    return this.cambiarEstado(idBloque, 'RESERVADO');
  }

  liberar(idBloque: bigint): Promise<void> {
    return this.cambiarEstado(idBloque, 'DISPONIBLE');
  }

  private async cambiarEstado(
    idBloque: bigint,
    estado: 'DISPONIBLE' | 'RESERVADO',
  ): Promise<void> {
    const destino = this.obtenerDestino();
    const url = new URL(
      `/integraciones/bloques/${idBloque}/estado`,
      destino.base,
    );
    await this.solicitar(
      url,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Integracion-Secret': destino.secreto,
        },
        body: JSON.stringify({ estado }),
        signal: AbortSignal.timeout(5000),
      },
      true,
    );
  }

  private async solicitar(
    url: URL,
    opciones: RequestInit,
    esBloque = false,
  ): Promise<Response> {
    try {
      const respuesta = await fetch(url, { ...opciones, redirect: 'error' });
      if (respuesta.ok) return respuesta;
      if (esBloque && respuesta.status === 404) {
        throw new ErrorSesion(
          'NO_ENCONTRADA',
          'El bloque ya no existe en materias-tutores.',
        );
      }
      if (respuesta.status === 409) {
        throw new ErrorSesion('CONFLICTO', 'El bloque ya no está disponible.');
      }
      throw new ErrorSesion(
        'DEPENDENCIA_NO_DISPONIBLE',
        'Materias-tutores no pudo completar la operación.',
      );
    } catch (error: unknown) {
      if (error instanceof ErrorSesion) throw error;
      throw new ErrorSesion(
        'DEPENDENCIA_NO_DISPONIBLE',
        'No se pudo conectar con materias-tutores.',
      );
    }
  }

  private obtenerDestino(): { base: URL; secreto: string } {
    const base = this.configuracion.get<string>('MATERIAS_TUTORES_URL');
    const secreto = this.configuracion.get<string>('INTEGRACION_SECRET');
    let url: URL | undefined;
    try {
      if (base) url = new URL(base);
    } catch {
      url = undefined;
    }
    if (
      !url ||
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !secreto ||
      Buffer.byteLength(secreto) < 32
    ) {
      throw new ErrorSesion(
        'DEPENDENCIA_NO_DISPONIBLE',
        'La integración con materias-tutores no está configurada.',
      );
    }
    return { base: url, secreto };
  }
}
