import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RegistrarUsuarioUseCase } from './aplicacion/registrar-user.use-case';
import { UsuariosPersistenceModule } from './infraestructura/usuarios-persistence.module';
import { UsuariosController } from './usuarios.controller';
import { ConsultarDatosPublicosUseCase } from './aplicacion/consultar-datos-publicos.use-case';
import {
  DATOS_PUBLICOS_REPOSITORY,
  type DatosPublicosRepository,
} from './dominio/ports/usuario.repository';

@Module({
  imports: [UsuariosPersistenceModule, AuthModule],
  controllers: [UsuariosController],
  providers: [
    RegistrarUsuarioUseCase,
    {
      provide: ConsultarDatosPublicosUseCase,
      inject: [DATOS_PUBLICOS_REPOSITORY],
      useFactory: (usuarios: DatosPublicosRepository) =>
        new ConsultarDatosPublicosUseCase(usuarios),
    },
  ],
  exports: [RegistrarUsuarioUseCase],
})
export class UsuariosModule {}
