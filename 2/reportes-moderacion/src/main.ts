import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { serializeBigInt } from './config/json-serialization.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('json replacer', serializeBigInt);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
