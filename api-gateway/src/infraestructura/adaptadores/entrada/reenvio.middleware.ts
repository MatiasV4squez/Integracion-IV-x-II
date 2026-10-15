import { Injectable } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { ReenviarPeticion } from '../../../aplicacion/casos-de-uso/reenviar-peticion';
import { ErrorReenvio, type Servicio } from '../../../dominio/reenvio';

@Injectable()
export class ReenvioMiddleware {
  constructor(private readonly reenviarPeticion: ReenviarPeticion) {}

  async usar(peticion: IncomingMessage, respuesta: ServerResponse, siguiente: () => void) {
    const cancelacion = new AbortController();
    const cancelar = () => cancelacion.abort();
    respuesta.once('close', cancelar);
    peticion.once('aborted', cancelar);
    peticion.once('error', cancelar);
    let servicio: Servicio | undefined;
    try {
      const resultado = await this.reenviarPeticion.ejecutar({
        metodo: peticion.method ?? 'GET',
        ruta: peticion.url ?? '/',
        encabezados: peticion.headers,
        // Al cancelar la carga no se destruye el socket que debe recibir el error.
        cuerpo: peticion.iterator({ destroyOnReturn: false }),
      }, cancelacion.signal);
      if (!resultado) {
        respuesta.off('close', cancelar);
        peticion.off('aborted', cancelar);
        peticion.off('error', cancelar);
        siguiente();
        return;
      }
      servicio = resultado.servicio;
      if (respuesta.destroyed) return;
      for (const [nombre, valor] of Object.entries(resultado.respuesta.encabezados)) {
        // CORS se establece en la entrada, incluso si el micro tiene otra política.
        if (valor === undefined || nombre.startsWith('access-control-')) continue;
        if (nombre === 'vary' && respuesta.hasHeader('vary')) {
          respuesta.setHeader(nombre, `${respuesta.getHeader('vary')}, ${valor}`);
        } else {
          respuesta.setHeader(nombre, valor);
        }
      }
      respuesta.writeHead(resultado.respuesta.estado);
      Readable.from(resultado.respuesta.cuerpo)
        .once('error', () => respuesta.destroy())
        .pipe(respuesta);
    } catch (error) {
      if (respuesta.destroyed || respuesta.writableEnded) return;
      if (respuesta.headersSent) {
        respuesta.destroy();
        return;
      }
      const motivo = error instanceof ErrorReenvio ? error.motivo : 'COMUNICACION';
      servicio = error instanceof ErrorReenvio ? error.servicio : servicio;
      const [estado, mensaje] = {
        SIN_CONFIGURAR: [503, 'Servicio sin configurar.'],
        COMUNICACION: [502, 'No se pudo completar la comunicación con el servicio.'],
        TIEMPO_AGOTADO: [504, 'Tiempo de espera del servicio agotado.'],
      }[motivo] as [number, string];
      respuesta.writeHead(estado, { 'content-type': 'application/json; charset=utf-8' });
      respuesta.end(JSON.stringify({ statusCode: estado, mensaje, servicio }));
    }
  }
}
