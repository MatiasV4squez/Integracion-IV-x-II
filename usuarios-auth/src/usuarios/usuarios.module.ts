import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PasswordService } from '../auth/infraestructura/seguridad/password.service';
import { RegistrarUsuarioUseCase } from './aplicacion/registrar-usuario.use-case';
import { UsuariosPersistenceModule } from './infraestructura/persistencia/usuarios-persistence.module';
import { UsuariosController } from './infraestructura/http/usuarios.controller';
import type { PasswordHasher } from './dominio/ports/password.hasher';
import { ConsultarDatosPublicosUseCase } from './aplicacion/consultar-datos-publicos.use-case';
import {
  DATOS_PUBLICOS_REPOSITORY,
  USUARIO_REPOSITORY,
  type DatosPublicosRepository,
  type UsuarioRepository,
} from './dominio/ports/usuario.repository';

@Module({
  imports: [UsuariosPersistenceModule, AuthModule],
  controllers: [UsuariosController],
  providers: [
    {
      provide: RegistrarUsuarioUseCase,
      inject: [USUARIO_REPOSITORY, PasswordService],
      useFactory: (usuarios: UsuarioRepository, contrasenas: PasswordHasher) =>
        new RegistrarUsuarioUseCase(usuarios, contrasenas),
    },
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
