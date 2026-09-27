import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailVerificationSender } from './ports/email-verification.sender';

@Injectable()
export class SmtpEmailVerificationSender implements EmailVerificationSender {
  private readonly transporter: Transporter;
  private readonly remitente: string;

  constructor(config: ConfigService) {
    this.remitente = config.getOrThrow<string>('SMTP_FROM');
    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: config.getOrThrow<number>('SMTP_PORT'),
      secure: config.getOrThrow<boolean>('SMTP_SECURE'),
      auth: {
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASSWORD'),
      },
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
    });
  }

  async enviar(destinatario: string, enlace: string): Promise<void> {
    const enlaceHtml = enlace
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;');
    await this.transporter.sendMail({
      from: this.remitente,
      to: destinatario,
      subject: 'Verifica tu correo institucional en STP',
      text: [
        'Confirma tu correo institucional para habilitar tu cuenta en STP.',
        `Abre este enlace: ${enlace}`,
        'Si no solicitaste una cuenta, ignora este mensaje.',
      ].join('\n\n'),
      html: [
        '<p>Confirma tu correo institucional para habilitar tu cuenta en STP.</p>',
        `<p><a href="${enlaceHtml}">Verificar correo</a></p>`,
        '<p>Si no solicitaste una cuenta, ignora este mensaje.</p>',
      ].join(''),
    });
  }
}
