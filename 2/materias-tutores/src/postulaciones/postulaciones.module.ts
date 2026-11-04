import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthenticatedJwtGuard } from '../auth/authenticated-jwt.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { PostulacionesController } from './infraestructura/http/postulaciones.controller.js';
import { PrismaPostulacionesRepository } from './infraestructura/prisma-postulaciones.repository.js';
import { CertificadosDiscoAdapter } from './infraestructura/certificados-disco.adapter.js';
import { HttpAsignarRolTutorAdapter } from './infraestructura/http-asignar-rol-tutor.adapter.js';
import { POSTULACIONES_REPOSITORY, type PostulacionesRepository } from './aplicacion/puertos/postulaciones.repository.js';
import { CERTIFICADOS, type CertificadosPort } from './aplicacion/puertos/certificados.port.js';
import { ASIGNAR_ROL_TUTOR, type AsignarRolTutorPort } from './aplicacion/puertos/asignar-rol-tutor.port.js';
import { PostularTutorUseCase } from './aplicacion/postular-tutor.use-case.js';
import { ConsultarPostulacionesPropiasUseCase } from './aplicacion/consultar-postulaciones-propias.use-case.js';
import { ListarPostulacionesPendientesUseCase } from './aplicacion/listar-postulaciones-pendientes.use-case.js';
import { ObtenerCertificadoUseCase } from './aplicacion/obtener-certificado.use-case.js';
import { AprobarPostulacionUseCase } from './aplicacion/aprobar-postulacion.use-case.js';
import { RechazarPostulacionUseCase } from './aplicacion/rechazar-postulacion.use-case.js';
import { ReintentarAsignacionRolUseCase } from './aplicacion/reintentar-asignacion-rol.use-case.js';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [PostulacionesController],
  providers: [
    AuthenticatedJwtGuard,
    { provide: POSTULACIONES_REPOSITORY, useClass: PrismaPostulacionesRepository },
    { provide: CERTIFICADOS, useClass: CertificadosDiscoAdapter },
    { provide: ASIGNAR_ROL_TUTOR, useClass: HttpAsignarRolTutorAdapter },
    {
      provide: PostularTutorUseCase, inject: [POSTULACIONES_REPOSITORY, CERTIFICADOS],
      useFactory: (repo: PostulacionesRepository, certificados: CertificadosPort) => new PostularTutorUseCase(repo, certificados),
    },
    {
      provide: ConsultarPostulacionesPropiasUseCase, inject: [POSTULACIONES_REPOSITORY],
      useFactory: (repo: PostulacionesRepository) => new ConsultarPostulacionesPropiasUseCase(repo),
    },
    {
      provide: ListarPostulacionesPendientesUseCase, inject: [POSTULACIONES_REPOSITORY],
      useFactory: (repo: PostulacionesRepository) => new ListarPostulacionesPendientesUseCase(repo),
    },
    {
      provide: ObtenerCertificadoUseCase, inject: [POSTULACIONES_REPOSITORY, CERTIFICADOS],
      useFactory: (repo: PostulacionesRepository, certificados: CertificadosPort) => new ObtenerCertificadoUseCase(repo, certificados),
    },
    {
      provide: AprobarPostulacionUseCase, inject: [POSTULACIONES_REPOSITORY, ASIGNAR_ROL_TUTOR],
      useFactory: (repo: PostulacionesRepository, roles: AsignarRolTutorPort) => new AprobarPostulacionUseCase(repo, roles),
    },
    {
      provide: RechazarPostulacionUseCase, inject: [POSTULACIONES_REPOSITORY],
      useFactory: (repo: PostulacionesRepository) => new RechazarPostulacionUseCase(repo),
    },
    {
      provide: ReintentarAsignacionRolUseCase, inject: [POSTULACIONES_REPOSITORY, ASIGNAR_ROL_TUTOR],
      useFactory: (repo: PostulacionesRepository, roles: AsignarRolTutorPort) => new ReintentarAsignacionRolUseCase(repo, roles),
    },
  ],
})
export class PostulacionesModule {}
