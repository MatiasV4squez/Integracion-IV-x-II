import { request as solicitarHttp, type IncomingMessage } from 'node:http';
import { request as solicitarHttps } from 'node:https';
import { Readable } from 'node:stream';
import { ClienteHttpPuerto } from '../../../aplicacion/puertos/cliente-http.puerto';
import {
  ErrorReenvio,
  type EncabezadosHttp,
  type PeticionMicroservicio,
  type RespuestaHttp,
} from '../../../dominio/reenvio';

// Estos encabezados pertenecen a cada conexión, no al mensaje reenviado.
function filtrarEncabezados(entrada: EncabezadosHttp): EncabezadosHttp {
  const conexion = entrada.connection;
  const excluidos = new Set([
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'proxy-connection', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host',
    ...(Array.isArray(conexion) ? conexion.join(',') : conexion ?? '')
      .toLowerCase().split(',').map((valor) => valor.trim()),
  ]);
  return Object.fromEntries(
    Object.entries(entrada).filter(([nombre]) => !excluidos.has(nombre)),
  );
}

export class ClienteHttpNodeAdapter extends ClienteHttpPuerto {
  enviar(peticion: PeticionMicroservicio, cancelacion: AbortSignal): Promise<RespuestaHttp> {
    return new Promise((resolve, reject) => {
      const destino = new URL(peticion.urlBase);
      const solicitar = destino.protocol === 'https:' ? solicitarHttps : solicitarHttp;
      const solicitud = solicitar(destino, {
        method: peticion.metodo,
        // Evitar normalizar la ruta conserva escapes y consultas repetidas.
        path: destino.pathname.replace(/\/$/, '') + peticion.ruta,
        headers: filtrarEncabezados(peticion.encabezados),
      });
      const fuente = Readable.from(peticion.cuerpo);
      let recibida: IncomingMessage | undefined;
      const liberar = () => {
        clearTimeout(temporizador);
        cancelacion.removeEventListener('abort', cancelar);
      };
      const fallar = (error: ErrorReenvio) => {
        liberar();
        fuente.destroy();
        recibida?.destroy(error);
        solicitud.destroy(error);
        reject(error);
      };
      const cancelar = () => fallar(new ErrorReenvio('COMUNICACION'));
      const temporizador = setTimeout(
        () => fallar(new ErrorReenvio('TIEMPO_AGOTADO')),
        peticion.tiempoEsperaMs,
      );
      fuente.once('error', cancelar);
      solicitud.once('error', (error) => {
        fallar(error instanceof ErrorReenvio ? error : new ErrorReenvio('COMUNICACION'));
      });
      solicitud.once('response', (respuesta) => {
        recibida = respuesta;
        // Puede fallar antes de que el consumidor empiece a leer el cuerpo.
        respuesta.on('error', () => {});
        resolve({
          estado: respuesta.statusCode ?? 502,
          encabezados: filtrarEncabezados(respuesta.headers),
          cuerpo: (async function* () {
            try {
              for await (const parte of respuesta) yield parte as Uint8Array;
            } catch (error) {
              throw error instanceof ErrorReenvio ? error : new ErrorReenvio('COMUNICACION');
            } finally {
              liberar();
              fuente.destroy();
              solicitud.destroy();
            }
          })(),
        });
      });
      cancelacion.addEventListener('abort', cancelar, { once: true });
      if (cancelacion.aborted) cancelar();
      else fuente.pipe(solicitud);
    });
  }
}
