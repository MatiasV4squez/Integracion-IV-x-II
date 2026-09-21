import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { MateriasService } from './materias.service.js';

describe('MateriasService', () => {
  let service: MateriasService;

  const prismaMock = {
    materia: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MateriasService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<MateriasService>(MateriasService);
  });

  const materiasEsperadas = [
    { codigo: 'INFO1126', nombre: 'PROGRAMACIÓN III' },
    { codigo: 'MAT1188', nombre: 'CÁLCULO INTERMEDIO' },
  ];

  it('debería listar las materias correctamente', async () => {
    prismaMock.materia.findMany.mockResolvedValue(materiasEsperadas);

    await expect(service.listarMaterias()).resolves.toEqual(materiasEsperadas);

    expect(prismaMock.materia.findMany).toHaveBeenCalledWith({
      select: {
        codigo: true,
        nombre: true,
      },
      orderBy: {
        codigo: 'asc',
      },
    });
  });
});
