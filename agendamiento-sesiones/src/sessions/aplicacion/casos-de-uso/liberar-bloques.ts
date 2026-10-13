import { ErrorSesion } from '../../dominio/errores/error-sesion';
import type { RepositorioLiberaciones } from '../puertos/repositorio-liberaciones.puerto';
import type { RepositorioSesiones } from '../puertos/repositorio-sesiones.puerto';
import type { DisponibilidadTutores } from '../puertos/disponibilidad-tutores.puerto';
import type { LiberacionBloques, Reloj, RegistroAplicacion } from '../puertos/servicios-aplicacion.puerto';

export class LiberarBloques implements LiberacionBloques {
  constructor(
    private readonly liberaciones: RepositorioLiberaciones,
    private readonly sesiones: Pick<
      RepositorioSesiones,
      'existeSesionActivaEnBloque'
    >,
    private readonly disponibilidad: Pick<DisponibilidadTutores, 'liberar'>,
    private readonly reloj: Reloj,
    private readonly registro: RegistroAplicacion,
  ) {}

  async procesar(idSesion: bigint): Promise<boolean> {
    try {
      const pendiente = await this.liberaciones.buscar(idSesion);
      if (!pendiente || pendiente.fecha_liberacion) return false;
      if (await this.sesiones.existeSesionActivaEnBloque(pendiente.id_bloque)) {
        await this.liberaciones.registrarIntento(
          idSesion,
          undefined,
          'El bloque sigue comprometido por una sesión activa.',
        );
        return false;
      }
      try {
        await this.disponibilidad.liberar(pendiente.id_bloque);
      } catch (error: unknown) {
        // Si el bloque ya no existe, no queda ninguna reserva que liberar.
        if (
          !(error instanceof ErrorSesion) ||
          error.motivo !== 'NO_ENCONTRADA'
        ) {
          await this.liberaciones.registrarIntento(
            idSesion,
            undefined,
            'No se pudo liberar el bloque en materias-tutores.',
          );
          return false;
        }
      }
      await this.liberaciones.registrarIntento(idSesion, this.reloj.ahora());
      return true;
    } catch {
      this.registro.error(
        `No se pudo procesar la liberación de la sesión ${idSesion}; se reintentará.`,
      );
      return false;
    }
  }

  async reenviarPendientes(): Promise<void> {
    const pendientes = await this.liberaciones.consultarPendientes(10);
    for (const pendiente of pendientes)
      await this.procesar(pendiente.id_sesion);
  }
}
