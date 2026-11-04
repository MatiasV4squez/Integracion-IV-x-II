import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CrearReporteUseCase } from './crear-reporte.use-case.js';
import { REPORTE_REPOSITORY } from '../dominio/ports/reporte.repository.js';

async function capturarError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('CrearReporteUseCase', () => {
  let useCase: CrearReporteUseCase;

  const mockCrear = vi.fn();

  const solicitudValida = {
    titulo: 'Comportamiento inapropiado',
    descripcion: 'El usuario incumplió las normas de la sesión.',
    id_sesion: '10',
    id_usuario_reportador: '1',
    id_usuario_reportado: '2',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrearReporteUseCase,
        {
          provide: REPORTE_REPOSITORY,
          useValue: { crear: mockCrear },
        },
      ],
    }).compile();

    useCase = module.get<CrearReporteUseCase>(CrearReporteUseCase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('guarda la sesión y los usuarios asociados al reporte', async () => {
    const reporteGuardado = { id: 1, estado: 'PENDIENTE' };
    mockCrear.mockResolvedValue(reporteGuardado);

    const resultado = await useCase.ejecutar(solicitudValida);

    expect(mockCrear).toHaveBeenCalledWith({
      titulo: solicitudValida.titulo,
      descripcion: solicitudValida.descripcion,
      idSesion: 10n,
      usuarioReportadorId: 1n,
      usuarioReportadoId: 2n,
    });
    expect(resultado).toEqual(reporteGuardado);
  });

  it('acepta identificadores numéricos', async () => {
    mockCrear.mockResolvedValue({ id: 2, estado: 'PENDIENTE' });

    await useCase.ejecutar({
      ...solicitudValida,
      id_sesion: 11,
      id_usuario_reportador: 3,
      id_usuario_reportado: 4,
    });

    expect(mockCrear).toHaveBeenCalledWith(
      expect.objectContaining({
        idSesion: 11n,
        usuarioReportadorId: 3n,
        usuarioReportadoId: 4n,
      }),
    );
  });

  it('rechaza un id_sesion inválido', async () => {
    const error = await capturarError(
      useCase.ejecutar({ ...solicitudValida, id_sesion: '0' }),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'REPORT_PAYLOAD_INVALID',
    });
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('rechaza identificadores de usuario inválidos', async () => {
    const error = await capturarError(
      useCase.ejecutar({ ...solicitudValida, id_usuario_reportado: 'abc' }),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'REPORT_PAYLOAD_INVALID',
    });
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('rechaza que el reportador sea el mismo usuario reportado', async () => {
    const error = await capturarError(
      useCase.ejecutar({ ...solicitudValida, id_usuario_reportado: '1' }),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockCrear).not.toHaveBeenCalled();
  });
});
