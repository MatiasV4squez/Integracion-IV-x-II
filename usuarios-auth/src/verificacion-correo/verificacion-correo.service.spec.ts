import { Test, TestingModule } from '@nestjs/testing';
import { VerificacionCorreoService } from './verificacion-correo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('VerificacionCorreoService', () => {
  let service: VerificacionCorreoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificacionCorreoService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<VerificacionCorreoService>(VerificacionCorreoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
