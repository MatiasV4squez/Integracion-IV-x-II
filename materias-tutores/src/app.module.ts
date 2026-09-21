import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MateriasModule } from './materias/materias.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ validate: validateEnvironment }),
    DatabaseModule,
    MateriasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
