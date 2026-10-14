import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsuariosPersistenceModule } from '../usuarios/infraestructura/usuarios-persistence.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JWT_AUDIENCE, JWT_ISSUER } from './auth.constants';
import {
  PASSWORD_VERIFIER,
  TOKEN_PROVIDER,
  SESSION_REPOSITORY,
  MODERACION_CUENTAS_REPOSITORY,
  SESSION_IDLE_TIMEOUT_SECONDS,
} from './dominio/auth.ports';
import { AuthService } from './aplicacion/auth.service';
import { PasswordService } from './infraestructura/seguridad/password.service';
import { TokenService } from './infraestructura/seguridad/token.service';
import { PrismaAuthRepository } from './infraestructura/persistencia/prisma-auth.repository';
import { SessionService } from './aplicacion/session.service';
import { ModeracionCuentasService } from './aplicacion/moderacion-cuentas.service';
import { JwtAuthGuard } from './infraestructura/http/jwt-auth.guard';
import { InternalServiceGuard } from './infraestructura/http/internal-service.guard';
import { AuthController } from './infraestructura/http/auth.controller';
import { InternalModeracionController } from './infraestructura/http/internal-moderacion.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UsuariosPersistenceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS'),
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
      }),
    }),
  ],
  controllers: [AuthController, InternalModeracionController],
  providers: [
    {
      provide: SESSION_IDLE_TIMEOUT_SECONDS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<number>('JWT_IDLE_TIMEOUT_SECONDS'),
    },
    { provide: PASSWORD_VERIFIER, useClass: PasswordService },
    { provide: TOKEN_PROVIDER, useClass: TokenService },
    PrismaAuthRepository,
    { provide: SESSION_REPOSITORY, useExisting: PrismaAuthRepository },
    {
      provide: MODERACION_CUENTAS_REPOSITORY,
      useExisting: PrismaAuthRepository,
    },
    AuthService,
    SessionService,
    ModeracionCuentasService,
    JwtAuthGuard,
    InternalServiceGuard,
  ],
  exports: [AuthService, JwtAuthGuard, TOKEN_PROVIDER, SessionService],
})
export class AuthModule {}
