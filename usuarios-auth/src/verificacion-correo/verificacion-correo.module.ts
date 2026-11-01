import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogEmailVerificationSender } from './log-email-verification.sender';
import { VerificacionCorreoService } from './verificacion-correo.service';
import { VerificacionCorreoController } from './verificacion-correo.controller';
import { EmailVerificationController } from './email-verification.controller';
import { EmailVerificationService } from './email-verification.service';
import { EMAIL_VERIFICATION_SENDER } from './ports/email-verification.sender';
import { SmtpEmailVerificationSender } from './smtp-email-verification.sender';

@Module({
  controllers: [VerificacionCorreoController, EmailVerificationController],
  providers: [
    VerificacionCorreoService,
    EmailVerificationService,
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
