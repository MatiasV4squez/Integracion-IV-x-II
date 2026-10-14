import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { USUARIO_REPOSITORY } from '../dominio/ports/usuario.repository';
import { PrismaUsuarioRepository } from './prisma-usuario.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: USUARIO_REPOSITORY, useClass: PrismaUsuarioRepository },
  ],
  exports: [USUARIO_REPOSITORY],
})
export class UsuariosPersistenceModule {}
