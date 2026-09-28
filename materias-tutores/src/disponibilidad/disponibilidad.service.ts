import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma, type BloqueHorario } from '../generated/prisma/client.js';
import type { CrearBloqueDisponibilidadDto } from './dto/crear-bloque-disponibilidad.dto.js';
import type { BloqueDisponibilidadResponseDto } from './dto/bloque-disponibilidad.response.dto.js';
import type { ActualizarBloqueDisponibilidadDto } from './dto/actualizar-bloque-disponibilidad.dto.js';

const ZONA_HORARIA = 'America/Santiago';
const FORMATO_HORARIO = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

@Injectable()
export class DisponibilidadService {
  constructor(private readonly prisma: PrismaService) {}

  private convertirFecha(dia: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
      throw new BadRequestException('La fecha debe usar el formato YYYY-MM-DD');
    }

    const fecha = new Date(`${dia}T00:00:00.000Z`);

    if (
      Number.isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== dia
    ) {
      throw new BadRequestException('La fecha no es valida');
    }

    return fecha;
  }

  private convertirHora(hora: string, campo: string): Date {
    const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);

    if (!coincidencia) {
      throw new BadRequestException(`${campo} debe usar el formato HH:mm`);
    }

    const [, horas, minutos] = coincidencia;

    return new Date(Date.UTC(1970, 0, 1, Number(horas), Number(minutos)));
  }

  private formatearFecha(fecha: Date): string {
    return fecha.toISOString().slice(0, 10);
  }

  private formatearHora(hora: Date): string {
    return hora.toISOString().slice(11, 16);
  }

  private mapearBloque(bloque: BloqueHorario): BloqueDisponibilidadResponseDto {
    return {
      idBloque: bloque.idBloque.toString(),
      dia: this.formatearFecha(bloque.dia),
      horaInicio: this.formatearHora(bloque.horaInicio),
      horaFin: this.formatearHora(bloque.horaFin),
      estadoBloque: bloque.estadoBloque,
    };
  }

  async crearBloque(
    idTutor: bigint,
    dto: CrearBloqueDisponibilidadDto,
  ): Promise<BloqueDisponibilidadResponseDto> {
    const dia = this.convertirFecha(dto.dia);
    const horaInicio = this.convertirHora(dto.horaInicio, 'horaInicio');
    const horaFin = this.convertirHora(dto.horaFin, 'horaFin');

    if (horaInicio >= horaFin) {
      throw new BadRequestException(
        'La hora de inicio debe ser menor que la hora de fin',
      );
    }

    const bloque = await this.prisma.bloqueHorario.create({
      data: {
        idTutor,
        dia: dia,
        horaInicio: horaInicio,
        horaFin: horaFin,
      },
    });

    return this.mapearBloque(bloque);
  }

  async listarBloques(
    idTutor: bigint,
  ): Promise<BloqueDisponibilidadResponseDto[]> {
    const bloques = await this.prisma.bloqueHorario.findMany({
      where: { idTutor },
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
    });

    return bloques.map((bloque) => this.mapearBloque(bloque));
  }

  async consultarDisponibilidadTutor(
    idTutor: bigint,
  ): Promise<BloqueDisponibilidadResponseDto[]> {
    const partes = FORMATO_HORARIO.formatToParts(new Date());
    const valor = (tipo: string): string =>
      partes.find((parte) => parte.type === tipo)!.value;
    const diaActual = this.convertirFecha(
      `${valor('year')}-${valor('month')}-${valor('day')}`,
    );
    const horaActual = this.convertirHora(
      `${valor('hour')}:${valor('minute')}`,
      'horaActual',
    );

    const bloques = await this.prisma.bloqueHorario.findMany({
      where: {
        idTutor,
        estadoBloque: 'DISPONIBLE',
        OR: [
          { dia: { gt: diaActual } },
          { dia: diaActual, horaInicio: { gt: horaActual } },
        ],
      },
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }, { idBloque: 'asc' }],
    });

    return bloques.map((bloque) => this.mapearBloque(bloque));
  }

  async actualizarBloque(
    idTutor: bigint,
    idBloque: bigint,
    dto: ActualizarBloqueDisponibilidadDto,
  ): Promise<BloqueDisponibilidadResponseDto> {
    const bloqueExistente = await this.prisma.bloqueHorario.findUnique({
      where: { idTutor, idBloque },
    });

    if (!bloqueExistente) {
      throw new NotFoundException('Bloque de disponibilidad no encontrado');
    }

    if (bloqueExistente.estadoBloque !== 'DISPONIBLE') {
      throw new ConflictException('El bloque no está disponible');
    }

    const diaTexto = dto.dia ?? this.formatearFecha(bloqueExistente.dia);
    const inicioTexto =
      dto.horaInicio ?? this.formatearHora(bloqueExistente.horaInicio);
    const finTexto = dto.horaFin ?? this.formatearHora(bloqueExistente.horaFin);

    const dia = this.convertirFecha(diaTexto);
    const horaInicio = this.convertirHora(inicioTexto, 'horaInicio');
    const horaFin = this.convertirHora(finTexto, 'horaFin');

    if (horaInicio >= horaFin) {
      throw new BadRequestException(
        'La hora de inicio debe ser menor que la hora de fin',
      );
    }

    let bloque: BloqueHorario;

    try {
      bloque = await this.prisma.bloqueHorario.update({
        where: {
          idBloque,
          idTutor,
          estadoBloque: 'DISPONIBLE',
        },
        data: { dia, horaInicio, horaFin },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(
          'El bloque cambió y ya no se puede actualizar',
        );
      }

      throw error;
    }

    return this.mapearBloque(bloque);
  }

  async desactivarBloque(
    idTutor: bigint,
    idBloque: bigint,
  ): Promise<BloqueDisponibilidadResponseDto> {
    const bloqueExistente = await this.prisma.bloqueHorario.findUnique({
      where: { idTutor, idBloque },
    });

    if (!bloqueExistente) {
      throw new NotFoundException('Bloque de disponibilidad no encontrado');
    }

    if (bloqueExistente.estadoBloque !== 'DISPONIBLE') {
      throw new ConflictException('El bloque no está disponible');
    }

    let bloque: BloqueHorario;

    try {
      bloque = await this.prisma.bloqueHorario.update({
        where: { idBloque, idTutor, estadoBloque: 'DISPONIBLE' },
        data: { estadoBloque: 'INACTIVO' },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(
          'El bloque cambió y ya no se puede desactivar',
        );
      }

      throw error;
    }

    return this.mapearBloque(bloque);
  }
}
