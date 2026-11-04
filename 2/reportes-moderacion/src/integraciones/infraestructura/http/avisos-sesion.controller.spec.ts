import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AvisosSesionController } from './avisos-sesion.controller.js';
import { RegistrarAvisoSesionUseCase } from '../../aplicacion/registrar-aviso-sesion.use-case.js';
import {
  TIPO_CONFLICTO_DETECTADO,
  TIPO_CONFLICTO_RESUELTO,
} from '../../dominio/aviso-sesion.js';
import type { AvisoConflictoDto } from './dto/aviso-conflicto.dto.js';
import type { AvisoResolucionDto } from './dto/aviso-resolucion.dto.js';

describe('AvisosSesionController', () => {
  let controller: AvisosSesionController;

  const mockEjecutar = vi.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvisosSesionController],
      providers: [
        {
          provide: RegistrarAvisoSesionUseCase,
          useValue: { ejecutar: mockEjecutar },
        },
      ],
    }).compile();

    controller = module.get<AvisosSesionController>(AvisosSesionController);
    mockEjecutar.mockResolvedValue({ id_aviso: '31', duplicado: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('delega el registro del aviso de conflicto con el tipo esperado', async () => {
    const dto = { id_aviso: '31' } as unknown as AvisoConflictoDto;

    const resultado = await controller.conflicto(dto);

    expect(mockEjecutar).toHaveBeenCalledWith(dto, TIPO_CONFLICTO_DETECTADO);
    expect(resultado).toEqual({ id_aviso: '31', duplicado: false });
  });

  it('delega el registro del aviso de resolución con el tipo esperado', async () => {
    const dto = { id_aviso: '32' } as unknown as AvisoResolucionDto;

    await controller.resolucion(dto);

    expect(mockEjecutar).toHaveBeenCalledWith(dto, TIPO_CONFLICTO_RESUELTO);
  });
});
