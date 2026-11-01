import { Logger, type INestApplicationContext } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import nodemailer, { type Transporter } from 'nodemailer';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import {
  EMAIL_VERIFICATION_SENDER,
  type EmailVerificationSender,
} from './ports/email-verification.sender';
import { VerificacionCorreoModule } from './verificacion-correo.module';

describe('Entrega del enlace de verificación', () => {
  const enlace = 'http://localhost:5173/verificar-cuenta?token=prueba';
  const sendMail = jest.fn().mockResolvedValue({});
  let modulo: INestApplicationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({ sendMail } as unknown as Transporter);
  });
  afterEach(async () => {
    await modulo?.close();
    jest.restoreAllMocks();
  });

  async function crearSender(config: Record<string, unknown>) {
    modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [() => config],
        }),
        PrismaModule,
        VerificacionCorreoModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    return modulo.get<EmailVerificationSender>(EMAIL_VERIFICATION_SENDER);
  }

  it('registra el enlace sin crear transporte ni exigir SMTP', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    const sender = await crearSender({ SMTP_DISABLED: true });
    await sender.enviar('alumno@example.test', enlace);
    expect(log).toHaveBeenCalledWith(expect.stringContaining(enlace));
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it.each([undefined, { user: 'usuario', pass: 'clave-de-prueba' }])(
    'envía por SMTP con auth=%j',
    async (auth) => {
      const sender = await crearSender({
        SMTP_DISABLED: false,
        SMTP_HOST: 'mailpit',
        SMTP_PORT: 1025,
        SMTP_SECURE: false,
        SMTP_FROM: 'no-reply@example.test',
        SMTP_USER: auth?.user,
        SMTP_PASSWORD: auth?.pass,
      });
      await sender.enviar('alumno@example.test', enlace);
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'mailpit', port: 1025, auth }),
      );
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'alumno@example.test',
          text: expect.stringContaining(enlace),
        }),
      );
    },
  );
});
