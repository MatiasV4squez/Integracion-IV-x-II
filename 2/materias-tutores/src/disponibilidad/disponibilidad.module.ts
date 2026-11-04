import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthenticatedJwtGuard } from '../auth/authenticated-jwt.guard.js';
import { TutorJwtGuard } from '../auth/tutor-jwt.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { ConsultaDisponibilidadController } from './infraestructura/http/consulta-disponibilidad.controller.js';
import { DisponibilidadController } from './infraestructura/http/disponibilidad.controller.js';
import { DISPONIBILIDAD_REPOSITORY, type DisponibilidadRepository } from './aplicacion/puertos/disponibilidad.repository.js';
import { RELOJ_DISPONIBILIDAD, type Reloj } from './aplicacion/puertos/reloj.port.js';
import { CrearBloqueUseCase } from './aplicacion/crear-bloque.use-case.js';
import { ListarBloquesUseCase } from './aplicacion/listar-bloques.use-case.js';
import { ConsultarDisponibilidadTutorUseCase } from './aplicacion/consultar-disponibilidad-tutor.use-case.js';
import { ActualizarBloqueUseCase } from './aplicacion/actualizar-bloque.use-case.js';
import { DesactivarBloqueUseCase } from './aplicacion/desactivar-bloque.use-case.js';
import { PrismaDisponibilidadRepository } from './infraestructura/prisma-disponibilidad.repository.js';
import { RelojSistemaAdapter } from './infraestructura/reloj-sistema.adapter.js';

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
  providers: [
    TutorJwtGuard,
    AuthenticatedJwtGuard,
    { provide: DISPONIBILIDAD_REPOSITORY, useClass: PrismaDisponibilidadRepository },
    { provide: RELOJ_DISPONIBILIDAD, useClass: RelojSistemaAdapter },
    { provide: CrearBloqueUseCase, inject: [DISPONIBILIDAD_REPOSITORY], useFactory: (repositorio: DisponibilidadRepository) => new CrearBloqueUseCase(repositorio) },
    { provide: ListarBloquesUseCase, inject: [DISPONIBILIDAD_REPOSITORY], useFactory: (repositorio: DisponibilidadRepository) => new ListarBloquesUseCase(repositorio) },
    { provide: ActualizarBloqueUseCase, inject: [DISPONIBILIDAD_REPOSITORY], useFactory: (repositorio: DisponibilidadRepository) => new ActualizarBloqueUseCase(repositorio) },
    { provide: DesactivarBloqueUseCase, inject: [DISPONIBILIDAD_REPOSITORY], useFactory: (repositorio: DisponibilidadRepository) => new DesactivarBloqueUseCase(repositorio) },
    {
      provide: ConsultarDisponibilidadTutorUseCase,
      inject: [DISPONIBILIDAD_REPOSITORY, RELOJ_DISPONIBILIDAD],
      useFactory: (repositorio: DisponibilidadRepository, reloj: Reloj) => new ConsultarDisponibilidadTutorUseCase(repositorio, reloj),
    },
  ],
  exports: [ConsultarDisponibilidadTutorUseCase],
})
export class DisponibilidadModule {}
