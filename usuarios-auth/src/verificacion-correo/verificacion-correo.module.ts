import { Module } from '@nestjs/common';
import { VerificacionCorreoService } from './verificacion-correo.service';
import { VerificacionCorreoController } from './verificacion-correo.controller';

@Module({
  controllers: [VerificacionCorreoController],
  providers: [VerificacionCorreoService],
})
export class VerificacionCorreoModule {}
