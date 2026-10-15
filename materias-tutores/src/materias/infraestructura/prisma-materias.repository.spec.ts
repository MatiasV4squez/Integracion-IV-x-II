import type { PrismaService } from '../../database/prisma.service.js';
import { PrismaMateriasRepository } from './prisma-materias.repository.js';

describe('PrismaMateriasRepository', () => {
  const prisma = { materia: { findMany: vi.fn() } };
  const repositorio = new PrismaMateriasRepository(prisma as unknown as PrismaService);

  beforeEach(() => vi.resetAllMocks());

  it('selecciona código/nombre y solicita el orden por código', async () => {
    prisma.materia.findMany.mockResolvedValue([{ codigo: 'MAT1188', nombre: 'CÁLCULO INTERMEDIO', idMateria: 9007199254740993n }]);
    await expect(repositorio.listarCatalogo()).resolves.toEqual([{ codigo: 'MAT1188', nombre: 'CÁLCULO INTERMEDIO' }]);
    expect(prisma.materia.findMany).toHaveBeenCalledWith({ select: { codigo: true, nombre: true }, orderBy: { codigo: 'asc' } });
  });

  it('devuelve una lista vacía si no hay registros', async () => {
    prisma.materia.findMany.mockResolvedValue([]);
    await expect(repositorio.listarCatalogo()).resolves.toEqual([]);
  });

  it('conserva un fallo de conexión para que HTTP responda con error', async () => {
    const error = new Error('Conexión fallida');
    prisma.materia.findMany.mockRejectedValue(error);
    await expect(repositorio.listarCatalogo()).rejects.toBe(error);
  });
});
