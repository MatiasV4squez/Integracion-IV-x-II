import { Logger } from '@nestjs/common';
import type { EmailVerificationSender } from './ports/email-verification.sender';

export class LogEmailVerificationSender implements EmailVerificationSender {
  private readonly logger = new Logger(LogEmailVerificationSender.name);

  async enviar(destinatario: string, enlace: string): Promise<void> {
    this.logger.log(`Verificación para ${destinatario}: ${enlace}`);
  }
}
