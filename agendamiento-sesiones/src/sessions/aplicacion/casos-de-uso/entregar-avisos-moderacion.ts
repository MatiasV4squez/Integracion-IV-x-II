import type { RepositorioAvisosModeracion } from '../puertos/repositorio-avisos-moderacion.puerto';
import type { PublicadorModeracion } from '../puertos/publicador-moderacion.puerto';
import type { EntregaAvisosModeracion, RegistroAplicacion, Reloj } from '../puertos/servicios-aplicacion.puerto';

export class EntregarAvisosModeracion implements EntregaAvisosModeracion {
  constructor(
    private readonly avisos: RepositorioAvisosModeracion,
    private readonly publicador: PublicadorModeracion,
    private readonly reloj: Reloj,
    private readonly registro: RegistroAplicacion,
  ) {}

  async procesar(idAviso: bigint): Promise<boolean> {
    try {
      if (!this.publicador.estaConfigurado()) return false;
      const aviso = await this.avisos.buscar(idAviso);
      if (!aviso || aviso.fecha_entrega) return false;
      if (
        aviso.contenido.tipo === 'CONFLICTO_RESUELTO' &&
        (await this.avisos.existeConflictoPendiente(aviso.id_sesion))
      )
        return false;
      let publicada = false;
      try {
        publicada = await this.publicador.publicar(aviso);
      } catch {
        // Un fallo remoto conserva el aviso y no revierte la decisión local.
      }
      await this.avisos.registrarIntento(
        idAviso,
        publicada ? this.reloj.ahora() : undefined,
        publicada
          ? undefined
          : 'No se pudo entregar el aviso a reportes/moderación.',
      );
      return publicada;
    } catch {
      this.registro.error(
        `No se pudo procesar el aviso de moderación ${idAviso}; se reintentará.`,
      );
      return false;
    }
  }

  async reenviarPendientes(): Promise<void> {
    try {
      if (!this.publicador.estaConfigurado()) return;
      const pendientes = await this.avisos.consultarPendientes(10);
      for (const pendiente of pendientes)
        await this.procesar(pendiente.id_aviso);
    } catch {
      this.registro.error(
        'No se pudieron consultar los avisos de moderación pendientes.',
      );
    }
  }
}
