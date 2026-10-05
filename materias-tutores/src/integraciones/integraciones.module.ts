import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthenticatedJwtGuard } from '../auth/authenticated-jwt.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { IntegracionesController } from './integraciones.controller.js';
import { IntegracionesService } from './integraciones.service.js';
import { ReputacionController } from './reputacion.controller.js';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [IntegracionesController, ReputacionController],
  providers: [IntegracionesService, AuthenticatedJwtGuard],
})
export class IntegracionesModule {}
