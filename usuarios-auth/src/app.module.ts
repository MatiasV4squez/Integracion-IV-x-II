// Agustin Modified

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { validateEnvironment } from './config/environment';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { UsuarioRolModule } from './usuario-rol/usuario-rol.module';
import { VerificacionCorreoModule } from './verificacion-correo/verificacion-correo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    UsuariosModule,
    RolesModule,
    UsuarioRolModule,
    VerificacionCorreoModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
