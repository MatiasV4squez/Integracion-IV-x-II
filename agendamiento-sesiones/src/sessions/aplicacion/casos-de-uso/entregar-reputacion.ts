import type { RepositorioEntregas } from '../puertos/repositorio-entregas.puerto';
import type { PublicadorReputacion } from '../puertos/publicador-reputacion.puerto';
import type { EntregaReputacion, Reloj } from '../puertos/servicios-aplicacion.puerto';

export class EntregarReputacion implements EntregaReputacion {
  constructor(
    private readonly entregas: RepositorioEntregas,
    private readonly publicador: PublicadorReputacion,
    private readonly reloj: Reloj,
  ) {}

  async enviarCalificacion(idCalificacion: bigint): Promise<boolean> {
    if (!this.publicador.estaConfigurado()) return false;
    const entrega = await this.entregas.buscar(idCalificacion);
    if (!entrega || entrega.fecha_entrega) return false;
    const publicada = await this.publicador.publicar(entrega.calificacion);
    await this.entregas.registrarIntento(
      idCalificacion,
      publicada ? this.reloj.ahora() : undefined,
    );
    return publicada;
  }

  async reenviarPendientes(): Promise<void> {
    if (!this.publicador.estaConfigurado()) return;
    const pendientes = await this.entregas.consultarPendientes(10);
    for (const pendiente of pendientes)
      await this.enviarCalificacion(pendiente.id_calificacion);
  }
}
