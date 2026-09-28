import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { BlocksModule } from '../integrations/materias-tutores/blocks.module';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule, BlocksModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
