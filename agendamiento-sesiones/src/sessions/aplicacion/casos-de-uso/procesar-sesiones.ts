import { validarTransicion } from '../../dominio/reglas/reglas-sesion';
import type { UnidadDeTrabajo } from '../puertos/unidad-de-trabajo.puerto';
import type { RepositorioSesiones } from '../puertos/repositorio-sesiones.puerto';
import type { Reloj, RegistroAplicacion, LiberacionBloques } from '../puertos/servicios-aplicacion.puerto';
import { cambiarEstadoSesion } from './gestionar-sesiones';

export class ProcesarSesiones {
  constructor(
    private readonly unidadDeTrabajo: UnidadDeTrabajo,
    private readonly sesiones: RepositorioSesiones,
    private readonly reloj: Reloj,
    private readonly registro: RegistroAplicacion,
    private readonly liberaciones: LiberacionBloques,
  ) {}

  async expirarSolicitudes(): Promise<void> {
    const limite = new Date(this.reloj.ahora().getTime() - 24 * 60 * 60 * 1000);
    const pendientes = await this.sesiones.buscarPendientesVencidas(limite);
    for (const sesion of pendientes) {
      try {
        const expirada = await this.unidadDeTrabajo.ejecutar(
          async (contexto) => {
            validarTransicion(sesion.estado_sesion, 'EXPIRADA');
            const cambiada = await contexto.sesiones.expirarSiSiguePendiente(
              sesion.id_sesion,
              limite,
            );
            if (!cambiada) return false;
            await contexto.liberaciones.registrarPendiente(
              sesion.id_sesion,
              sesion.id_bloque,
            );
            return true;
          },
        );
        if (expirada) await this.liberaciones.procesar(sesion.id_sesion);
      } catch {
        this.registro.error(
          `No se pudo completar la expiración de ${sesion.id_sesion}; se reintentará.`,
        );
      }
    }
  }

  async pasarAPendienteCierre(): Promise<void> {
    validarTransicion('CONFIRMADA', 'PENDIENTE_CIERRE');
    await this.sesiones.cerrarConfirmadasTerminadas(this.reloj.ahora());
  }

  async resolverDeclaracionesVencidas(): Promise<void> {
    const limite = new Date(this.reloj.ahora().getTime() - 48 * 60 * 60 * 1000);
    const pendientes = await this.sesiones.buscarCierresVencidos(limite);
    for (const candidata of pendientes) {
      try {
        const resuelta = await this.unidadDeTrabajo.ejecutar(
          async (contexto) => {
            const sesion = await contexto.sesiones.buscarConDeclaraciones(
              candidata.id_sesion,
            );
            if (
              !sesion ||
              sesion.estado_sesion !== 'PENDIENTE_CIERRE' ||
              sesion.declaraciones.length !== 1 ||
              sesion.declaraciones[0].fecha_declaracion > limite
            )
              return;
            return cambiarEstadoSesion(
              contexto,
              sesion,
              sesion.declaraciones[0].resultado_declarado,
              true,
            );
          },
        );
        if (resuelta) await this.liberaciones.procesar(resuelta.id_sesion);
      } catch {
        this.registro.error(
          `No se pudo resolver provisionalmente la sesión ${candidata.id_sesion}.`,
        );
      }
    }
  }
}
