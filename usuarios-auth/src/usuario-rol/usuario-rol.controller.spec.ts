import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioRolController } from './usuario-rol.controller';
import { UsuarioRolService } from './usuario-rol.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('UsuarioRolController', () => {
  let controller: UsuarioRolController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuarioRolController],
      providers: [UsuarioRolService, { provide: PrismaService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsuarioRolController>(UsuarioRolController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
