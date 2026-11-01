import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  DATOS_PUBLICOS_REPOSITORY,
  USUARIO_REPOSITORY,
} from '../dominio/ports/usuario.repository';
import { PrismaUsuarioRepository } from './prisma-usuario.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: USUARIO_REPOSITORY, useClass: PrismaUsuarioRepository },
    { provide: DATOS_PUBLICOS_REPOSITORY, useExisting: USUARIO_REPOSITORY },
  ],
  exports: [USUARIO_REPOSITORY, DATOS_PUBLICOS_REPOSITORY],
})
export class UsuariosPersistenceModule {}
