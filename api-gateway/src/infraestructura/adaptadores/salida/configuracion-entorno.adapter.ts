import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfiguracionGatewayPuerto } from '../../../aplicacion/puertos/configuracion-gateway.puerto';
import type { Servicio } from '../../../dominio/reenvio';

const VARIABLES: Record<Servicio, string> = {
  'usuarios-auth': 'USUARIOS_AUTH_URL',
  'materias-tutores': 'MATERIAS_TUTORES_URL',
  'agendamiento-sesiones': 'AGENDAMIENTO_SESIONES_URL',
  'reportes-moderacion': 'REPORTES_MODERACION_URL',
};

@Injectable()
export class ConfiguracionEntornoAdapter extends ConfiguracionGatewayPuerto {
  constructor(private readonly configuracion: ConfigService) {
    super();
  }

  obtenerUrl(servicio: Servicio) {
    return this.configuracion.get<string>(VARIABLES[servicio]);
  }

  obtenerTiempoEsperaMs() {
    return this.configuracion.getOrThrow<number>('HTTP_TIMEOUT_MS');
  }
}
