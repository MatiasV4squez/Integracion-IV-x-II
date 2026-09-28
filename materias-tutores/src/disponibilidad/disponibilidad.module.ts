import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TutorJwtGuard } from '../auth/tutor-jwt.guard.js';
import { DatabaseModule } from '../database/database.module.js';
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
  controllers: [DisponibilidadController],
  providers: [DisponibilidadService, TutorJwtGuard],
})
export class DisponibilidadModule {}
