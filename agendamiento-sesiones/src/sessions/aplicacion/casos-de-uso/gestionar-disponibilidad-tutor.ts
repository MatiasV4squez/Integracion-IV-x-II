import { Logger } from '@nestjs/common';
import type { DisponibilidadTutor } from '../../dominio/entidades/disponibilidad-tutor';
import { ErrorDisponibilidad } from '../../dominio/errores/error-disponibilidad';
import { interpretarIdentificador } from '../../dominio/reglas/reglas-sesion';
import {
  convertirHorario,
  obtenerDia,
  obtenerHora,
} from '../../dominio/reglas/reglas-disponibilidad';
import type {
  ConsultarDisponibilidadFiltros,
  EntradaCrearDisponibilidad,
  EntradaEditarDisponibilidad,
} from '../contratos/entradas-disponibilidad';
import type { RepositorioDisponibilidadTutor } from '../puertos/repositorio-disponibilidad-tutor.puerto';

export class GestionarDisponibilidadTutor {
  constructor(
    private readonly disponibilidad: RepositorioDisponibilidadTutor,
    private readonly logger = new Logger(GestionarDisponibilidadTutor.name),
  ) {}

  async listarDisponibilidad(
    idTutor: string,
    filtros?: ConsultarDisponibilidadFiltros,
  ): Promise<DisponibilidadTutor[]> {
    const tutorId = interpretarIdentificador(idTutor, 'id_tutor');
    return this.disponibilidad.listarPorTutor(tutorId, filtros);
  }

  async crearDisponibilidad(
    idTutor: string,
    entrada: EntradaCrearDisponibilidad,
  ): Promise<DisponibilidadTutor> {
    const tutorId = interpretarIdentificador(idTutor, 'id_tutor');
    const { inicio, fin } = convertirHorario(
      entrada.dia,
      entrada.hora_inicio,
      entrada.hora_fin,
    );
    if (await this.disponibilidad.existeSolapamiento(tutorId, inicio, fin)) {
      throw new ErrorDisponibilidad(
        'CONFLICTO',
        'Ya existe un bloque de disponibilidad que se solapa con ese horario.',
      );
    }
    return this.disponibilidad.crear({
      id_tutor: tutorId,
      inicio,
      fin,
      estado: 'DISPONIBLE',
    });
  }

  async editarDisponibilidad(
    idTutor: string,
    idDisponibilidad: string,
    entrada: EntradaEditarDisponibilidad,
  ): Promise<DisponibilidadTutor> {
    const tutorId = interpretarIdentificador(idTutor, 'id_tutor');
    const id = interpretarIdentificador(idDisponibilidad, 'id_disponibilidad');

    const existente = await this.disponibilidad.buscarPorId(id);
    if (!existente) {
      throw new ErrorDisponibilidad(
        'NO_ENCONTRADA',
        'El bloque de disponibilidad no existe.',
      );
    }
    if (existente.id_tutor !== tutorId) {
      throw new ErrorDisponibilidad(
        'PROHIBIDO',
        'Solo el tutor propietario puede editar el bloque.',
      );
    }

    const dia = obtenerDia(existente.inicio);
    const horaInicio = entrada.hora_inicio ?? obtenerHora(existente.inicio);
    const horaFin = entrada.hora_fin ?? obtenerHora(existente.fin);
    const { inicio, fin } = convertirHorario(dia, horaInicio, horaFin);

    if (
      entrada.estado === undefined &&
      inicio.getTime() === existente.inicio.getTime() &&
      fin.getTime() === existente.fin.getTime()
    ) {
      return existente;
    }

    if (
      await this.disponibilidad.existeSolapamiento(tutorId, inicio, fin, id)
    ) {
      throw new ErrorDisponibilidad(
        'CONFLICTO',
        'El horario se solapa con otro bloque de disponibilidad.',
      );
    }

    const actualizada = await this.disponibilidad.actualizar(id, {
      inicio,
      fin,
      estado: entrada.estado,
    });
    if (!actualizada) {
      throw new ErrorDisponibilidad(
        'CONFLICTO',
        'El bloque de disponibilidad cambió. Actualiza e intenta nuevamente.',
      );
    }
    return actualizada;
  }

  async eliminarDisponibilidad(
    idTutor: string,
    idDisponibilidad: string,
  ): Promise<void> {
    const tutorId = interpretarIdentificador(idTutor, 'id_tutor');
    const id = interpretarIdentificador(idDisponibilidad, 'id_disponibilidad');

    const existente = await this.disponibilidad.buscarPorId(id);
    if (!existente) {
      throw new ErrorDisponibilidad(
        'NO_ENCONTRADA',
        'El bloque de disponibilidad no existe.',
      );
    }
    if (existente.id_tutor !== tutorId) {
      throw new ErrorDisponibilidad(
        'PROHIBIDO',
        'Solo el tutor propietario puede eliminar el bloque.',
      );
    }
    if (existente.estado === 'RESERVADO') {
      throw new ErrorDisponibilidad(
        'CONFLICTO',
        'No se puede eliminar un bloque ya reservado.',
      );
    }

    const eliminado = await this.disponibilidad.eliminar(id);
    if (!eliminado) {
      throw new ErrorDisponibilidad(
        'CONFLICTO',
        'El bloque de disponibilidad ya fue eliminado.',
      );
    }
  }
}
