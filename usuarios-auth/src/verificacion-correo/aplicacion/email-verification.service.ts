import { EmailVerificationError } from '../dominio/email-verification.error';
import type { EmailVerificationSender } from '../dominio/ports/email-verification.sender';
import type { VerificationTokenProvider } from '../dominio/ports/verification-token.provider';
import type { VerificacionCorreoRepository } from '../dominio/ports/verificacion-correo.repository';

const RESPUESTA_REENVIO = {
  mensaje: 'Si la cuenta existe y requiere verificación, se enviará un correo.',
};

export class EmailVerificationService {
  constructor(
    private readonly verificaciones: VerificacionCorreoRepository,
    private readonly sender: EmailVerificationSender,
    private readonly tokens: VerificationTokenProvider,
    private readonly config: { url: string; ttlMinutos: number },
  ) {}

  async reenviar(correoInstitucional: string) {
    const usuario =
      await this.verificaciones.buscarUsuario(correoInstitucional);
    if (usuario && !usuario.correoVerificado) {
      await this.solicitarVerificacion(
        usuario.idUsuario,
        usuario.correoInstitucional,
      );
    }
    return RESPUESTA_REENVIO;
  }

  async solicitarVerificacion(
    idUsuario: bigint,
    correoInstitucional: string,
  ): Promise<void> {
    const token = this.tokens.generar();
    const fechaExpiracion = new Date(
      Date.now() + this.config.ttlMinutos * 60_000,
    );
    const idVerificacion = await this.verificaciones.crear(
      idUsuario,
      this.tokens.hash(token),
      fechaExpiracion,
    );
    const url = new URL(this.config.url);
    url.searchParams.set('token', token);
    try {
      await this.sender.enviar(correoInstitucional, url.toString());
    } catch {
      await this.verificaciones.eliminar(idVerificacion);
      throw new EmailVerificationError(
        'EMAIL_DELIVERY_FAILED',
        'No fue posible enviar el correo de verificación.',
      );
    }
    await this.verificaciones.invalidarAnteriores(
      idUsuario,
      idVerificacion,
      new Date(),
    );
  }

  async confirmar(token: string) {
    const verificacion = await this.verificaciones.buscarPorHash(
      this.tokens.hash(token),
    );
    if (!verificacion) {
      throw new EmailVerificationError(
        'EMAIL_VERIFICATION_TOKEN_INVALID',
        'El enlace de verificación no es válido.',
      );
    }
    if (verificacion.fechaUtilizacion) {
      throw new EmailVerificationError(
        'EMAIL_VERIFICATION_TOKEN_USED',
        'El enlace de verificación ya fue utilizado.',
      );
    }
    if (verificacion.fechaExpiracion.getTime() <= Date.now()) {
      throw new EmailVerificationError(
        'EMAIL_VERIFICATION_TOKEN_EXPIRED',
        'El enlace de verificación expiró.',
      );
    }
    if (verificacion.correoVerificado) {
      throw new EmailVerificationError(
        'EMAIL_ALREADY_VERIFIED',
        'El correo ya se encuentra verificado.',
      );
    }
    const confirmado = await this.verificaciones.confirmar(
      verificacion.idVerificacion,
      verificacion.idUsuario,
      new Date(),
    );
    if (!confirmado) {
      throw new EmailVerificationError(
        'EMAIL_VERIFICATION_TOKEN_USED',
        'El enlace de verificación ya no está disponible.',
      );
    }
    return { mensaje: 'Correo verificado correctamente.' };
  }
}
