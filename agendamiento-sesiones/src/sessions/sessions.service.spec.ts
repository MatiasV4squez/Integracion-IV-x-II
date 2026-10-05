import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../database/prisma.service';

describe('SessionsService', () => {
  let service: SessionsService;

  const mockPrismaService = {
    sesion: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockReputacionService = {
    notificarCambio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: 'ReputacionIntegracionService',
          useValue: mockReputacionService,
        },
      ],
    })
      .useMocker((token) => {
        return jest.fn();
      })
      .compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('debe estar definido el servicio', () => {
    expect(service).toBeDefined();
  });

  it('debe validar que el servicio existe correctamente', () => {
    expect(typeof service.getHistorialSesiones).toBe('function');
  });

  it('debe validar la existencia del método de resolución de conflictos', () => {
    expect(typeof service.resolveConflict).toBe('function');
  });
});