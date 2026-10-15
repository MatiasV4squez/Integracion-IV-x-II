import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReenviarPeticion } from './aplicacion/casos-de-uso/reenviar-peticion';
import { ClienteHttpPuerto } from './aplicacion/puertos/cliente-http.puerto';
import { ConfiguracionGatewayPuerto } from './aplicacion/puertos/configuracion-gateway.puerto';
import { ReenvioMiddleware } from './infraestructura/adaptadores/entrada/reenvio.middleware';
import { SaludController } from './infraestructura/adaptadores/entrada/salud.controller';
import { ConfiguracionEntornoAdapter } from './infraestructura/adaptadores/salida/configuracion-entorno.adapter';
import { ClienteHttpNodeAdapter } from './infraestructura/adaptadores/salida/cliente-http-node.adapter';
import { validarConfiguracion } from './infraestructura/configuracion-entorno';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validarConfiguracion,
    }),
  ],
  controllers: [SaludController],
  providers: [
    { provide: ConfiguracionGatewayPuerto, useClass: ConfiguracionEntornoAdapter },
    { provide: ClienteHttpPuerto, useClass: ClienteHttpNodeAdapter },
    {
      provide: ReenviarPeticion,
      useFactory: (configuracion: ConfiguracionGatewayPuerto, cliente: ClienteHttpPuerto) =>
        new ReenviarPeticion(configuracion, cliente),
      inject: [ConfiguracionGatewayPuerto, ClienteHttpPuerto],
    },
    ReenvioMiddleware,
  ],
})
export class AppModule {}
