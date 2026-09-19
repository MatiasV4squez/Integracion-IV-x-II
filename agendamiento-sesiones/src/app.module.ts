import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestJS/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseUrl } from './database/database.config';
import { DatabaseModule } from './database/database.module';
import { SessionsModule } from './sessions/sessions.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [() => ({ databaseUrl: getDatabaseUrl(process.env) })],
    }),
    DatabaseModule,
    SessionsModule,
    ...(process.env.NODE_ENV === 'test'
      ? []
      : [
          ObserveModule.forRoot({
            appKey: 'YOUR_APP_KEY',
            appSecret: 'YOUR_APP_SECRET',
            serviceId: 'agendamiento-sesiones',
          }),
        ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}