import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsCronService } from './sessions-cron.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ReputacionIntegracionService } from './reputacion-integracion.service';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    SessionsCronService,
    ReputacionIntegracionService,
  ],
})
export class SessionsModule {}
