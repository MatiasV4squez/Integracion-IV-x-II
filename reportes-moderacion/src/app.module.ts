import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ReportesModule } from './reportes/reportes.module.js';

@Module({
  imports: [ReportesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}