import { describe, it, expect, vi } from 'vitest';
import { PrismaReporteConsultaRepository } from './prisma-reporte-consulta.repository.js';
import type { PrismaService } from '../../../compartido/prisma.service.js';

function prismaSimulado() {
  const findMany = vi.fn();
  const count = vi.fn();
  const transaction = vi.fn();
  const prisma = {
    reporte: { findMany, count },
    $transaction: transaction,
  } as unknown as PrismaService;
  return { prisma, findMany, count, transaction };
}

describe('PrismaReporteConsultaRepository', () => {
  it('construye el filtro y pagina la consulta', async () => {
    const { prisma, findMany, count, transaction } = prismaSimulado();
    findMany.mockReturnValue('FIND_MANY_PROMISE');
    count.mockReturnValue('COUNT_PROMISE');
    transaction.mockResolvedValue([[], 0]);

    const repository = new PrismaReporteConsultaRepository(prisma);
    const creadoDesde = new Date('2026-01-01T00:00:00.000Z');

    const resultado = await repository.consultar(
      { estado: 'PENDIENTE', creadoDesde },
      2,
      10,
    );

    expect(findMany).toHaveBeenCalledWith({
      where: { estado: 'PENDIENTE', creadoEn: { gte: creadoDesde } },
      orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
      skip: 10,
      take: 10,
    });
    expect(count).toHaveBeenCalledWith({
      where: { estado: 'PENDIENTE', creadoEn: { gte: creadoDesde } },
    });
    expect(transaction).toHaveBeenCalledWith([
      'FIND_MANY_PROMISE',
      'COUNT_PROMISE',
    ]);
    expect(resultado).toEqual({ datos: [], total: 0 });
  });

  it('omite el filtro cuando no hay estado ni fechas', async () => {
    const { prisma, findMany, count, transaction } = prismaSimulado();
    findMany.mockReturnValue('FIND_MANY_PROMISE');
    count.mockReturnValue('COUNT_PROMISE');
    transaction.mockResolvedValue([[], 0]);

    const repository = new PrismaReporteConsultaRepository(prisma);

    await repository.consultar({}, 1, 20);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, skip: 0, take: 20 }),
    );
  });
});
