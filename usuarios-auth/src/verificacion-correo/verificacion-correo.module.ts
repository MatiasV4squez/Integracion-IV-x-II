import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailVerificationService } from './aplicacion/email-verification.service';
import {
  EMAIL_VERIFICATION_SENDER,
  type EmailVerificationSender,
} from './dominio/ports/email-verification.sender';
import {
  VERIFICACION_CORREO_REPOSITORY,
  type VerificacionCorreoRepository,
} from './dominio/ports/verificacion-correo.repository';
import { EmailVerificationController } from './infraestructura/http/email-verification.controller';
import { LogEmailVerificationSender } from './infraestructura/correo/log-email-verification.sender';
import { SmtpEmailVerificationSender } from './infraestructura/correo/smtp-email-verification.sender';
import { PrismaVerificacionCorreoRepository } from './infraestructura/persistencia/prisma-verificacion-correo.repository';
import { CryptoVerificationTokenProvider } from './infraestructura/seguridad/crypto-verification-token.provider';

@Module({
  imports: [PrismaModule],
  controllers: [EmailVerificationController],
  providers: [
    {
      provide: VERIFICACION_CORREO_REPOSITORY,
      useClass: PrismaVerificacionCorreoRepository,
    },
    {
      provide: EmailVerificationService,
      inject: [
        VERIFICACION_CORREO_REPOSITORY,
        EMAIL_VERIFICATION_SENDER,
        ConfigService,
      ],
      useFactory: (
        repository: VerificacionCorreoRepository,
        sender: EmailVerificationSender,
        config: ConfigService,
      ) =>
        new EmailVerificationService(
          repository,
          sender,
          new CryptoVerificationTokenProvider(
            config.getOrThrow<string>('EMAIL_VERIFICATION_SECRET'),
          ),
          {
            url: config.getOrThrow<string>('EMAIL_VERIFICATION_URL'),
            ttlMinutos: config.getOrThrow<number>(
              'EMAIL_VERIFICATION_TTL_MINUTES',
            ),
          },
        ),
    },
    {
      provide: EMAIL_VERIFICATION_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<boolean>('SMTP_DISABLED')
          ? new LogEmailVerificationSender()
          : new SmtpEmailVerificationSender(config),
    },
  ],
  exports: [EmailVerificationService],
})
export class VerificacionCorreoModule {}
