import { Test, TestingModule } from '@nestjs/testing';
import { VerificacionCorreoController } from './verificacion-correo.controller';
import { VerificacionCorreoService } from './verificacion-correo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('VerificacionCorreoController', () => {
  let controller: VerificacionCorreoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificacionCorreoController],
      providers: [VerificacionCorreoService, { provide: PrismaService, useValue: {} }],
    }).compile();

    controller = module.get<VerificacionCorreoController>(VerificacionCorreoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
