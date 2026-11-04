import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { serializeBigInt } from './config/json-serialization';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  if (app.get(ConfigService).get<string>('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('API Usuarios - STP')
      .setDescription('Microservicio de Autenticación y Usuarios')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api', app, document);
  }

  app.set('json replacer', serializeBigInt);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}
void bootstrap();
