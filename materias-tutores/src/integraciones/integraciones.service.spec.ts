import { PrismaService } from '../database/prisma.service.js';
import { IntegracionesService } from './integraciones.service.js';

describe('IntegracionesService', () => {
  const prisma = {
    bloqueHorario: { findUnique: vi.fn(), updateMany: vi.fn() },
  };
  let servicio: IntegracionesService;

  beforeEach(() => {
    vi.resetAllMocks();
    servicio = new IntegracionesService(prisma as unknown as PrismaService);
  });

  it('reserva un bloque disponible mediante una escritura condicional', async () => {
    prisma.bloqueHorario.findUnique.mockResolvedValue({
      idBloque: 1n,
      estadoBloque: 'DISPONIBLE',
    });
    prisma.bloqueHorario.updateMany.mockResolvedValue({ count: 1 });
    await expect(servicio.cambiarEstadoBloque(1n, 'RESERVADO')).resolves.toEqual({ idBloque: '1', estadoBloque: 'RESERVADO' });
    expect(prisma.bloqueHorario.updateMany).toHaveBeenCalledWith({
      where: { idBloque: 1n, estadoBloque: 'DISPONIBLE' },
      data: { estadoBloque: 'RESERVADO' },
    });
  });

  it('impide reservar un bloque inactivo o cambiado concurrentemente', async () => {
    prisma.bloqueHorario.findUnique.mockResolvedValue({
      idBloque: 1n,
      estadoBloque: 'INACTIVO',
    });
    prisma.bloqueHorario.updateMany.mockResolvedValue({ count: 0 });
    await expect(servicio.cambiarEstadoBloque(1n, 'RESERVADO')).rejects.toMatchObject({ status: 409 });
  });
});
