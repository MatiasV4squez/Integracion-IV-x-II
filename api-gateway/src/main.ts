import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function iniciarGateway() {
  const aplicacion = await NestFactory.create(AppModule);
  const configuracion = aplicacion.get(ConfigService);
  const puerto = configuracion.getOrThrow<number>('PORT');

  aplicacion.setGlobalPrefix('api');
  aplicacion.enableShutdownHooks();
  await aplicacion.listen(puerto);
  Logger.log(
    `Gateway disponible en http://localhost:${puerto}/api/health`,
    'Inicio',
  );
}

void iniciarGateway();
