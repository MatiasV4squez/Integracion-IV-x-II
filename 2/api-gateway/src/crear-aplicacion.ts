import 'reflect-metadata';
import type { NestApplicationOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module';
import { ReenvioMiddleware } from './infraestructura/adaptadores/entrada/reenvio.middleware';

export async function crearAplicacion(opciones: NestApplicationOptions = {}) {
  // Los cuerpos se transmiten sin parsear: JSON, formularios y archivos.
  const aplicacion = await NestFactory.create(AppModule, {
    ...opciones,
    bodyParser: false,
  });
  const configuracion = aplicacion.get(ConfigService);
  const reenvio = aplicacion.get(ReenvioMiddleware);

  aplicacion.enableCors({
    origin: configuracion.getOrThrow<string>('CORS_ORIGIN'),
  });
  // Registrar CORS antes del proxy para cubrir también errores y preflight.
  aplicacion.use(
    (peticion: IncomingMessage, respuesta: ServerResponse, siguiente: () => void) =>
      void reenvio.usar(peticion, respuesta, siguiente),
  );
  aplicacion.setGlobalPrefix('api');
  return aplicacion;
}
