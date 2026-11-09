import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IntegracionSecretGuard } from './integracion-secret.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');

        if (Buffer.byteLength(secret, 'utf8') < 32) {
          throw new Error('JWT_SECRET debe contener al menos 32 bytes.');
        }

        return {
          secret,
          verifyOptions: {
            algorithms: ['HS256'],
            issuer: 'stp-usuarios-auth',
            audience: 'stp-clients',
          },
        };
      },
    }),
  ],
  providers: [JwtAuthGuard, IntegracionSecretGuard],
  exports: [JwtAuthGuard, JwtModule, IntegracionSecretGuard],
})
export class AuthModule {}
