import { ErrorSesion } from '../../dominio/errores/error-sesion';
import { interpretarIdentificador } from '../../dominio/reglas/reglas-sesion';
import { ESTADOS_SESION } from '../../dominio/tipos/estado-sesion';
import {
  LIMITE_HISTORIAL, PAGINA_MAXIMA_HISTORIAL, ROLES_HISTORIAL,
  type EntradaHistorialPaginado, type PaginaHistorial,
} from '../contratos/historial-paginado';
import type { RepositorioHistorial } from '../puertos/repositorio-historial.puerto';

export class ConsultarHistorialPaginado {
  constructor(private readonly repositorio: RepositorioHistorial) {}

  async ejecutar(idUsuario: string, entrada: EntradaHistorialPaginado = {}): Promise<PaginaHistorial> {
    const id = interpretarIdentificador(idUsuario, 'id_usuario');
    const page = interpretarPaginacion(entrada.page, 1, PAGINA_MAXIMA_HISTORIAL, 'page');
    const limit = interpretarPaginacion(entrada.limit, 20, LIMITE_HISTORIAL, 'limit');
    if (entrada.rol !== undefined && !ROLES_HISTORIAL.includes(entrada.rol)) {
      throw new ErrorSesion('ENTRADA_INVALIDA', 'rol debe ser ESTUDIANTE o TUTOR.');
    }
    if (entrada.estado !== undefined && !ESTADOS_SESION.includes(entrada.estado)) {
      throw new ErrorSesion('ENTRADA_INVALIDA', 'estado no es un estado de sesión válido.');
    }
    const { items, total } = await this.repositorio.consultar({
      idUsuario: id, page, limit, rol: entrada.rol, estado: entrada.estado,
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

function interpretarPaginacion(valor: unknown, porDefecto: number, maximo: number, campo: string): number {
  if (valor === undefined) return porDefecto;
  if (typeof valor !== 'string' || !/^[1-9][0-9]{0,6}$/.test(valor) || Number(valor) > maximo) {
    throw new ErrorSesion('ENTRADA_INVALIDA', `${campo} debe ser un entero entre 1 y ${maximo}.`);
  }
  return Number(valor);
}
