import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaVerificacionCorreoRepository } from './prisma-verificacion-correo.repository';

describe('Confirmacion atomica de correo con Prisma', () => {
  const tx = {
    verificacionCorreo: { updateMany: jest.fn() },
    usuario: { update: jest.fn(), updateMany: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const repository = new PrismaVerificacionCorreoRepository(
    prisma as unknown as PrismaService,
  );
  const ahora = new Date('2026-01-01T12:00:00Z');

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<boolean>) => callback(tx),
    );
    tx.verificacionCorreo.updateMany.mockResolvedValue({ count: 1 });
  });

  it('consume solo un token vigente y activa exclusivamente cuentas INACTIVO', async () => {
    await expect(repository.confirmar(10n, 1n, ahora)).resolves.toBe(true);
    expect(tx.verificacionCorreo.updateMany).toHaveBeenCalledWith({
      where: {
        id_verificacion: 10n,
        fecha_utilizacion: null,
        fecha_expiracion: { gt: ahora },
      },
      data: { fecha_utilizacion: ahora },
    });
    expect(tx.usuario.update).toHaveBeenCalledWith({
      where: { id_usuario: 1n },
      data: { correo_verificado: true },
    });
    expect(tx.usuario.updateMany).toHaveBeenCalledWith({
      where: { id_usuario: 1n, estado_cuenta: 'INACTIVO' },
      data: { estado_cuenta: 'ACTIVO' },
    });
  });

  it('no modifica la cuenta si el token ya se uso o expiro', async () => {
    tx.verificacionCorreo.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(repository.confirmar(10n, 1n, ahora)).resolves.toBe(false);
    expect(tx.usuario.update).not.toHaveBeenCalled();
    expect(tx.usuario.updateMany).not.toHaveBeenCalled();
  });

  it('propaga el fallo de la transaccion para impedir una confirmacion parcial', async () => {
    const error = new Error('No se pudo actualizar la cuenta');
    tx.usuario.update.mockRejectedValueOnce(error);
    await expect(repository.confirmar(10n, 1n, ahora)).rejects.toBe(error);
    expect(tx.usuario.updateMany).not.toHaveBeenCalled();
  });
});
