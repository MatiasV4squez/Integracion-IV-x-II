import type { DisponibilidadTutor } from '../../dominio/entidades/disponibilidad-tutor';
import type { EstadoDisponibilidad } from '../../dominio/tipos/estado-disponibilidad';
import type { ConsultarDisponibilidadFiltros } from '../contratos/entradas-disponibilidad';

export interface RepositorioDisponibilidadTutor {
  listarPorTutor(
    idTutor: bigint,
    filtros?: ConsultarDisponibilidadFiltros,
  ): Promise<DisponibilidadTutor[]>;
  buscarPorId(id: bigint): Promise<DisponibilidadTutor | null>;
  crear(datos: {
    id_tutor: bigint;
    inicio: Date;
    fin: Date;
    estado?: EstadoDisponibilidad;
  }): Promise<DisponibilidadTutor>;
  actualizar(
    id: bigint,
    cambios: Partial<{
      inicio: Date;
      fin: Date;
      estado: EstadoDisponibilidad;
    }>,
  ): Promise<DisponibilidadTutor | null>;
  eliminar(id: bigint): Promise<boolean>;
  existeSolapamiento(
    idTutor: bigint,
    inicio: Date,
    fin: Date,
    excluirId?: bigint,
  ): Promise<boolean>;
}
