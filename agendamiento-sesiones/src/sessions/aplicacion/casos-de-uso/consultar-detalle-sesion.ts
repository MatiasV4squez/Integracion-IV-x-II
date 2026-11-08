import { ErrorSesion } from '../../dominio/errores/error-sesion';
import { interpretarIdentificador, validarParticipante } from '../../dominio/reglas/reglas-sesion';
import { obtenerAccionesSesion } from '../../dominio/reglas/acciones-sesion';
import type { RepositorioDetalleSesion } from '../puertos/repositorio-detalle-sesion.puerto';
import type { Reloj } from '../puertos/servicios-aplicacion.puerto';

export class ConsultarDetalleSesion {
  constructor(
    private readonly repositorio: RepositorioDetalleSesion,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(idSesion: string, idUsuario: string, roles: readonly string[]) {
    const id = interpretarIdentificador(idSesion, 'id_sesion');
    const usuario = interpretarIdentificador(idUsuario, 'id_usuario');
    const sesion = await this.repositorio.buscarPorId(id);
    if (!sesion) throw new ErrorSesion('NO_ENCONTRADA', 'La sesión no existe.');

    const esAdministrador = roles.some((rol) =>
      ['ADMINISTRADOR', 'ADMIN'].includes(rol.trim().toUpperCase()),
    );
    if (!esAdministrador) validarParticipante(sesion, usuario);

    return {
      sesion,
      acciones_disponibles: obtenerAccionesSesion(sesion, usuario, esAdministrador, this.reloj.ahora()),
    };
  }
}
