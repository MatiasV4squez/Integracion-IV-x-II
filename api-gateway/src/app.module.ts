import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { validarConfiguracion } from './configuracion/configuracion-entorno';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validarConfiguracion,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
