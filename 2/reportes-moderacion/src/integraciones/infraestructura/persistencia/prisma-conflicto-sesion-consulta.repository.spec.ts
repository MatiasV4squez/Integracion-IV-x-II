import { describe, it, expect, vi, afterEach } from 'vitest';
import { PrismaConflictoSesionConsultaRepository } from './prisma-conflicto-sesion-consulta.repository.js';
import type { PrismaService } from '../../../compartido/prisma.service.js';

const filaConflicto = {
  id: 1,
  origen: 'agendamiento-sesiones',
  version: 1,
  idAviso: '31',
  fechaAviso: new Date('2026-10-13T12:00:00.000Z'),
  tipo: 'CONFLICTO_DETECTADO',
  idSesion: 24n,
  datos: { tipo: 'CONFLICTO_DETECTADO', id_sesion: '24' },
  creadoEn: new Date('2026-10-13T12:00:01.000Z'),
};

function prismaSimulado() {
  const findMany = vi.fn();
  const prisma = { avisoSesion: { findMany } } as unknown as PrismaService;
  return { prisma, findMany };
}

describe('PrismaConflictoSesionConsultaRepository', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('excluye los conflictos de sesiones con resolución registrada', async () => {
    const { prisma, findMany } = prismaSimulado();
    findMany
      .mockResolvedValueOnce([{ idSesion: 24n }])
      .mockResolvedValueOnce([filaConflicto]);

    const repository = new PrismaConflictoSesionConsultaRepository(prisma);
    const resultado = await repository.listarPendientes();

    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: { tipo: 'CONFLICTO_RESUELTO' },
      select: { idSesion: true },
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: {
        tipo: 'CONFLICTO_DETECTADO',
        idSesion: { notIn: [24n] },
      },
      orderBy: [{ fechaAviso: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    expect(resultado).toEqual([
      {
        id_aviso: '31',
        fecha_aviso: filaConflicto.fechaAviso,
        id_sesion: 24n,
        contenido: filaConflicto.datos,
      },
    ]);
  });

  it('no filtra por sesión cuando no hay resoluciones', async () => {
    const { prisma, findMany } = prismaSimulado();
    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const repository = new PrismaConflictoSesionConsultaRepository(prisma);
    const resultado = await repository.listarPendientes();

    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { tipo: 'CONFLICTO_DETECTADO' },
      orderBy: [{ fechaAviso: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    expect(resultado).toEqual([]);
  });
});
