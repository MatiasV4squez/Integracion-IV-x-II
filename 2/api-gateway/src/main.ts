import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { crearAplicacion } from './crear-aplicacion';

async function iniciarGateway() {
  const aplicacion = await crearAplicacion();
  const configuracion = aplicacion.get(ConfigService);
  const puerto = configuracion.getOrThrow<number>('PORT');

  aplicacion.enableShutdownHooks();
  await aplicacion.listen(puerto);
  Logger.log(
    `Gateway disponible en http://localhost:${puerto}/api/health`,
    'Inicio',
  );
}

void iniciarGateway();
