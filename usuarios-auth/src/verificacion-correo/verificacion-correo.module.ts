import { Module } from '@nestjs/common';
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
    SmtpEmailVerificationSender,
    {
      provide: EMAIL_VERIFICATION_SENDER,
      useExisting: SmtpEmailVerificationSender,
    },
  ],
  exports: [EmailVerificationService],
})
export class VerificacionCorreoModule {}
