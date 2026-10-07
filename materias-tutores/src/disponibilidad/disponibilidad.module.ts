import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthenticatedJwtGuard } from '../auth/authenticated-jwt.guard.js';
import { TutorJwtGuard } from '../auth/tutor-jwt.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { ConsultaDisponibilidadController } from './consulta-disponibilidad.controller.js';
import { DisponibilidadController } from './disponibilidad.controller.js';
import { DisponibilidadService } from './disponibilidad.service.js';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [DisponibilidadController, ConsultaDisponibilidadController],
  providers: [DisponibilidadService, TutorJwtGuard, AuthenticatedJwtGuard],
  exports: [DisponibilidadService],
})
export class DisponibilidadModule {}
