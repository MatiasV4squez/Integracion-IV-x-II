import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaTutoresRepository } from './prisma-tutores.repository.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('PrismaTutoresRepository - Búsqueda Paginada', () => {
  let repository: PrismaTutoresRepository;

  const mockPrisma = {
    tutorMateria: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    perfilTutor: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaTutoresRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaTutoresRepository>(PrismaTutoresRepository);
    
    vi.clearAllMocks();
  });

  it('debería calcular el skip de 0 y take de 10 para la página 1', async () => {
    await repository.buscarHabilitadosPorMateria(1n, { page: 1, limit: 10 });

    expect(mockPrisma.tutorMateria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
      })
    );
  });

  it('debería calcular el skip de 10 y take de 5 para la página 3', async () => {
    await repository.buscarHabilitadosPorMateria(1n, { page: 3, limit: 5 });

    expect(mockPrisma.tutorMateria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
      })
    );
  });
  
  it('debería devolver la estructura correcta de items y total', async () => {
    mockPrisma.tutorMateria.count.mockResolvedValue(50);
    
    const resultado = await repository.buscarHabilitadosPorMateria(1n, { page: 1, limit: 10 });
    
    expect(resultado).toHaveProperty('items');
    expect(resultado).toHaveProperty('total', 50);
  });
});