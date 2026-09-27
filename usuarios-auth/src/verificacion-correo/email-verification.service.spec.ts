import {
  ConflictException,
  GoneException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailVerificationService } from './email-verification.service';
import type { EmailVerificationSender } from './ports/email-verification.sender';

describe('EmailVerificationService', () => {
  const correo = 'estudiante@alu.uct.cl';
  const configValues: Record<string, unknown> = {
    EMAIL_VERIFICATION_TTL_MINUTES: 30,
    EMAIL_VERIFICATION_URL: 'https://app.example.test/verificar-correo',
    EMAIL_VERIFICATION_SECRET: 'secreto-de-verificacion-con-al-menos-32-bytes',
  };
  const sender = { enviar: jest.fn() };
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    verificacionCorreo: {
      create: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const config = {
    getOrThrow: jest.fn((key: string) => configValues[key]),
  };
  let service: EmailVerificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    sender.enviar.mockResolvedValue(undefined);
    prisma.verificacionCorreo.create.mockResolvedValue({
      id_verificacion: 10n,
    });
    prisma.verificacionCorreo.updateMany.mockResolvedValue({ count: 1 });
    prisma.usuario.update.mockResolvedValue({});
    prisma.usuario.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    service = new EmailVerificationService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
      sender as EmailVerificationSender,
    );
  });

  it('guarda el hash y envía el token original en el enlace', async () => {
    const inicio = Date.now();
    await service.solicitarVerificacion(1n, correo);

    const data = prisma.verificacionCorreo.create.mock.calls[0][0].data;
    const enlace = sender.enviar.mock.calls[0][1] as string;
    const token = new URL(enlace).searchParams.get('token');
    expect(token).toHaveLength(64);
    expect(data.token).toBe(
      createHmac('sha256', configValues.EMAIL_VERIFICATION_SECRET as string)
        .update(token as string)
        .digest('hex'),
    );
    expect(data.token).not.toBe(token);
    expect(data.id_usuario).toBe(1n);
    expect(data.fecha_expiracion.getTime()).toBeGreaterThanOrEqual(
      inicio + 30 * 60_000,
    );
    expect(sender.enviar).toHaveBeenCalledWith(correo, enlace);
    expect(prisma.verificacionCorreo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_usuario: 1n,
          id_verificacion: { not: 10n },
        }),
      }),
    );
  });

  it('elimina el token nuevo si SMTP falla', async () => {
    sender.enviar.mockRejectedValueOnce(new Error('SMTP no disponible'));

    await expect(
      service.solicitarVerificacion(1n, correo),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.verificacionCorreo.delete).toHaveBeenCalledWith({
      where: { id_verificacion: 10n },
    });
    expect(prisma.verificacionCorreo.updateMany).not.toHaveBeenCalled();
  });

  it('responde igual si la cuenta no existe o ya está verificada', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id_usuario: 1n,
        correo_institucional: correo,
        correo_verificado: true,
      });

    const inexistente = await service.reenviar(correo);
    const verificada = await service.reenviar(correo);
    expect(inexistente).toEqual(verificada);
    expect(sender.enviar).not.toHaveBeenCalled();
  });

  it('confirma una cuenta y activa únicamente estados INACTIVO', async () => {
    const token = 'a'.repeat(64);
    prisma.verificacionCorreo.findUnique.mockResolvedValue({
      id_verificacion: 10n,
      id_usuario: 1n,
      fecha_expiracion: new Date(Date.now() + 60_000),
      fecha_utilizacion: null,
      usuario: { correo_verificado: false },
    });

    await expect(service.confirmar(token)).resolves.toEqual({
      mensaje: 'Correo verificado correctamente.',
    });
    expect(prisma.verificacionCorreo.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          token: createHmac(
            'sha256',
            configValues.EMAIL_VERIFICATION_SECRET as string,
          )
            .update(token)
            .digest('hex'),
        },
      }),
    );
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id_usuario: 1n },
      data: { correo_verificado: true },
    });
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
      where: { id_usuario: 1n, estado_cuenta: 'INACTIVO' },
      data: { estado_cuenta: 'ACTIVO' },
    });
  });

  it('rechaza un token que ya fue utilizado', async () => {
    prisma.verificacionCorreo.findUnique.mockResolvedValue({
      id_verificacion: 10n,
      id_usuario: 1n,
      fecha_expiracion: new Date(Date.now() + 60_000),
      fecha_utilizacion: new Date(),
      usuario: { correo_verificado: false },
    });

    await expect(service.confirmar('a'.repeat(64))).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza un token vencido', async () => {
    prisma.verificacionCorreo.findUnique.mockResolvedValue({
      id_verificacion: 10n,
      id_usuario: 1n,
      fecha_expiracion: new Date(Date.now() - 1),
      fecha_utilizacion: null,
      usuario: { correo_verificado: false },
    });

    await expect(service.confirmar('a'.repeat(64))).rejects.toBeInstanceOf(
      GoneException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('impide consumir dos veces el token ante solicitudes concurrentes', async () => {
    prisma.verificacionCorreo.findUnique.mockResolvedValue({
      id_verificacion: 10n,
      id_usuario: 1n,
      fecha_expiracion: new Date(Date.now() + 60_000),
      fecha_utilizacion: null,
      usuario: { correo_verificado: false },
    });
    prisma.verificacionCorreo.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.confirmar('a'.repeat(64))).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });
});
