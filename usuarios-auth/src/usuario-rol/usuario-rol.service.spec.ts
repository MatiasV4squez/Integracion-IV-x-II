import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioRolService } from './usuario-rol.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsuarioRolService', () => {
  let service: UsuarioRolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsuarioRolService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<UsuarioRolService>(UsuarioRolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
