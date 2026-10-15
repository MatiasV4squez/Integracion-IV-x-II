import type { PeticionMicroservicio, RespuestaHttp } from '../../dominio/reenvio';

export abstract class ClienteHttpPuerto {
  abstract enviar(
    peticion: PeticionMicroservicio,
    cancelacion: AbortSignal,
  ): Promise<RespuestaHttp>;
}
