// Agustin Modified

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { VerificacionCorreoModule } from './verificacion-correo/verificacion-correo.module';
import { UsuarioRolModule } from './usuario-rol/usuario-rol.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true, 
    }),
    UsuariosModule,
    PrismaModule,
    RolesModule,
    VerificacionCorreoModule,
    UsuarioRolModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}