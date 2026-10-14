import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RegistrarUsuarioUseCase } from './aplicacion/registrar-user.use-case';
import { UsuariosPersistenceModule } from './infraestructura/usuarios-persistence.module';
import { UsuariosController } from './usuarios.controller';

@Module({
  imports: [UsuariosPersistenceModule, AuthModule],
  controllers: [UsuariosController],
  providers: [RegistrarUsuarioUseCase],
  exports: [RegistrarUsuarioUseCase],
})
export class UsuariosModule {}
