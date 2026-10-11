import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module'; // Dependiendo de cómo lo tengan configurado

// Importamos la nueva arquitectura
import { RegistrarUsuarioUseCase } from './aplicacion/registrar-user.use-case';
import { LoginUsuarioUseCase } from './aplicacion/login-usuario.use-case';
import { PrismaUsuarioRepository } from './infraestructura/prisma-usuario.repository';
import { USUARIO_REPOSITORY } from './dominio/ports/usuario.repository';

// Importamos el controlador
import { UsuariosController } from './usuarios.controller';

@Module({
  imports: [PrismaModule], 
  controllers: [UsuariosController],
  providers: [
    RegistrarUsuarioUseCase,
    LoginUsuarioUseCase,
    {
      // Aquí unimos el Puerto (Interfaz) con el Adaptador (Prisma)
      provide: USUARIO_REPOSITORY,
      useClass: PrismaUsuarioRepository,
    },
  ],
  exports: [RegistrarUsuarioUseCase, LoginUsuarioUseCase],
})
export class UsuariosModule {}