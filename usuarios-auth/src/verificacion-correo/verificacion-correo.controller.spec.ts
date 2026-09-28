import { Test, TestingModule } from '@nestjs/testing';
import { VerificacionCorreoController } from './verificacion-correo.controller';
import { VerificacionCorreoService } from './verificacion-correo.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('VerificacionCorreoController', () => {
  let controller: VerificacionCorreoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificacionCorreoController],
      providers: [VerificacionCorreoService, { provide: PrismaService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VerificacionCorreoController>(VerificacionCorreoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
