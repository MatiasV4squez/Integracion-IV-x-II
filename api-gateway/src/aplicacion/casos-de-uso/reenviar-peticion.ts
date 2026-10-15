import {
  ErrorReenvio,
  SERVICIOS,
  type PeticionHttp,
  type RespuestaHttp,
  type Servicio,
} from '../../dominio/reenvio';
import type { ClienteHttpPuerto } from '../puertos/cliente-http.puerto';
import type { ConfiguracionGatewayPuerto } from '../puertos/configuracion-gateway.puerto';

export interface ResultadoReenvio {
  servicio: Servicio;
  respuesta: RespuestaHttp;
}

export class ReenviarPeticion {
  constructor(
    private readonly configuracion: ConfiguracionGatewayPuerto,
    private readonly cliente: ClienteHttpPuerto,
  ) {}

  async ejecutar(
    peticion: PeticionHttp,
    cancelacion: AbortSignal,
  ): Promise<ResultadoReenvio | undefined> {
    const coincidencia = /^\/api\/([^/?]+)(?=\/|\?|$)/.exec(peticion.ruta);
    const servicio = SERVICIOS.find((nombre) => nombre === coincidencia?.[1]);
    if (!servicio || !coincidencia) return undefined;

    const urlBase = this.configuracion.obtenerUrl(servicio);
    if (!urlBase) throw new ErrorReenvio('SIN_CONFIGURAR', servicio);

    const resto = peticion.ruta.slice(coincidencia[0].length);
    const ruta = resto.startsWith('/') ? resto : `/${resto}`;
    try {
      const respuesta = await this.cliente.enviar({
        ...peticion,
        ruta,
        urlBase,
        tiempoEsperaMs: this.configuracion.obtenerTiempoEsperaMs(),
      }, cancelacion);
      return { servicio, respuesta };
    } catch (error) {
      if (error instanceof ErrorReenvio) {
        throw new ErrorReenvio(error.motivo, servicio);
      }
      throw error;
    }
  }
}
