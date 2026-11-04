export const EMAIL_VERIFICATION_SENDER = Symbol('EMAIL_VERIFICATION_SENDER');

export interface EmailVerificationSender {
  enviar(destinatario: string, enlace: string): Promise<void>;
}
