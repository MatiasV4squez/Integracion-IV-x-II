import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PasswordService } from './password.service';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { JWT_AUDIENCE, JWT_ISSUER } from './auth.constants';
import { InternalServiceGuard } from './internal-service.guard';

@Global()
@Module({
  imports: [
    UsuariosModule,
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
  controllers: [],
  providers: [
    PasswordService,
    InternalServiceGuard,
  ],
  exports: [JwtModule],
})
export class AuthModule {}
