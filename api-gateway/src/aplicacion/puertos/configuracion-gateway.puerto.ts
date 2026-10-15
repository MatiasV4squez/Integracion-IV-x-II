import type { Servicio } from '../../dominio/reenvio';

export abstract class ConfiguracionGatewayPuerto {
  abstract obtenerUrl(servicio: Servicio): string | undefined;
  abstract obtenerTiempoEsperaMs(): number;
}
