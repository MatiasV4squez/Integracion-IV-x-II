import { Prisma } from '../../../generated/prisma/client';
import type { PrismaService } from '../../../database/prisma.service';
import { ErrorSesion } from '../../dominio/errores/error-sesion';
import { UnidadDeTrabajoPrisma } from './unidad-de-trabajo-prisma';

describe('Reintentos acotados de la unidad de trabajo', () => {
  const conflicto = () => new Prisma.PrismaClientKnownRequestError('conflicto serializable', { code: 'P2034', clientVersion: '7' });
  let transaccion: jest.Mock;
  let unidad: UnidadDeTrabajoPrisma;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    transaccion = jest.fn();
    unidad = new UnidadDeTrabajoPrisma({ $transaction: transaccion } as unknown as PrismaService);
  });

  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('recupera una escritura tras más de tres abortos serializables', async () => {
    transaccion.mockRejectedValueOnce(conflicto()).mockRejectedValueOnce(conflicto())
      .mockRejectedValueOnce(conflicto()).mockRejectedValueOnce(conflicto()).mockResolvedValue('guardada');
    const comprobacion = expect(unidad.ejecutar(async () => 'guardada')).resolves.toBe('guardada');
    await jest.runAllTimersAsync();
    await comprobacion;
    expect(transaccion).toHaveBeenCalledTimes(5);
  });

  it('termina con conflicto controlado al agotar los intentos', async () => {
    transaccion.mockRejectedValue(conflicto());
    const comprobacion = expect(unidad.ejecutar(async () => 'guardada')).rejects.toMatchObject({ motivo: 'CONFLICTO' });
    await jest.runAllTimersAsync();
    await comprobacion;
    expect(transaccion).toHaveBeenCalledTimes(6);
  });

  it.each([new Error('conexión perdida'), new ErrorSesion('CONFLICTO', 'Horario ocupado')])(
    'no reintenta errores de negocio ni fallos de conexión: %s', async (error) => {
      transaccion.mockRejectedValue(error);
      await expect(unidad.ejecutar(async () => 'guardada')).rejects.toBe(error);
      expect(transaccion).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    },
  );
});
