import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ResolverReporteUseCase } from './resolver-reporte.use-case.js';
import { ModeracionUsuariosAuthService } from './moderacion-usuarios-auth.service.js';
import { REPORTE_REPOSITORY } from '../dominio/ports/reporte.repository.js';

const ADMIN_ID = '9';

async function capturarError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('ResolverReporteUseCase', () => {
  let useCase: ResolverReporteUseCase;

  const mockBuscarPorId = vi.fn();
  const mockResolver = vi.fn();
  const mockSuspenderUsuario = vi.fn();

  const reportePendiente = {
    id: 1,
    estado: 'PENDIENTE',
    usuarioReportadoId: 2n,
    reactivadoEn: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolverReporteUseCase,
        {
          provide: REPORTE_REPOSITORY,
          useValue: {
            buscarPorId: mockBuscarPorId,
            resolver: mockResolver,
          },
        },
        {
          provide: ModeracionUsuariosAuthService,
          useValue: { suspenderUsuario: mockSuspenderUsuario },
        },
      ],
    }).compile();

    useCase = module.get<ResolverReporteUseCase>(ResolverReporteUseCase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('suspende al usuario reportado y registra la resolución SUSPENDIDO', async () => {
    mockBuscarPorId.mockResolvedValue(reportePendiente);
    mockSuspenderUsuario.mockResolvedValue({
      id_usuario: '2',
      estado_cuenta: 'SUSPENDIDO',
    });
    mockResolver.mockResolvedValue({ id: 1, estado: 'SUSPENDIDO' });

    const resultado = await useCase.ejecutar(
      1,
      { estado: 'SUSPENDIDO', motivo: 'Reincidencia comprobada' },
      ADMIN_ID,
    );

    expect(mockBuscarPorId).toHaveBeenCalledWith(1);
    expect(mockSuspenderUsuario).toHaveBeenCalledWith('2');
    expect(mockResolver).toHaveBeenCalledWith(1, {
      estado: 'SUSPENDIDO',
      motivo: 'Reincidencia comprobada',
      resueltoPorId: 9n,
      resueltoEn: expect.any(Date),
    });
    expect(resultado.estado).toBe('SUSPENDIDO');
  });

  it('registra DESESTIMADO sin suspender al usuario', async () => {
    mockBuscarPorId.mockResolvedValue(reportePendiente);
    mockResolver.mockResolvedValue({ id: 1, estado: 'DESESTIMADO' });

    const resultado = await useCase.ejecutar(1, { estado: 'DESESTIMADO' }, ADMIN_ID);

    expect(mockSuspenderUsuario).not.toHaveBeenCalled();
    expect(mockResolver).toHaveBeenCalledWith(1, {
      estado: 'DESESTIMADO',
      motivo: null,
      resueltoPorId: 9n,
      resueltoEn: expect.any(Date),
    });
    expect(resultado.estado).toBe('DESESTIMADO');
  });

  it('registra una advertencia sin suspender al usuario', async () => {
    mockBuscarPorId.mockResolvedValue(reportePendiente);
    mockResolver.mockResolvedValue({ id: 1, estado: 'ADVERTIDO' });

    await useCase.ejecutar(1, { estado: 'ADVERTIDO', motivo: 'Primera falta' }, ADMIN_ID);

    expect(mockSuspenderUsuario).not.toHaveBeenCalled();
    expect(mockResolver).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ estado: 'ADVERTIDO', motivo: 'Primera falta' }),
    );
  });

  it('rechaza un estado de resolución inválido', async () => {
    const error = await capturarError(
      useCase.ejecutar(1, { estado: 'BANEADO' }, ADMIN_ID),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'REPORT_RESOLUTION_INVALID',
    });
    expect(mockBuscarPorId).not.toHaveBeenCalled();
    expect(mockResolver).not.toHaveBeenCalled();
  });

  it('rechaza un motivo vacío', async () => {
    const error = await capturarError(
      useCase.ejecutar(1, { estado: 'ADVERTIDO', motivo: '   ' }, ADMIN_ID),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'REPORT_RESOLUTION_INVALID',
    });
  });

  it('rechaza un motivo demasiado largo', async () => {
    const error = await capturarError(
      useCase.ejecutar(
        1,
        { estado: 'ADVERTIDO', motivo: 'x'.repeat(501) },
        ADMIN_ID,
      ),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'REPORT_RESOLUTION_INVALID',
    });
  });

  it('rechaza un identificador de reporte inválido', async () => {
    const error = await capturarError(
      useCase.ejecutar(0, { estado: 'ADVERTIDO' }, ADMIN_ID),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'REPORT_PAYLOAD_INVALID',
    });
  });

  it('devuelve 404 cuando el reporte no existe', async () => {
    mockBuscarPorId.mockResolvedValue(null);

    const error = await capturarError(
      useCase.ejecutar(99, { estado: 'ADVERTIDO' }, ADMIN_ID),
    );

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toMatchObject({
      code: 'REPORT_NOT_FOUND',
    });
    expect(mockResolver).not.toHaveBeenCalled();
  });

  it('rechaza resolver un reporte que ya está resuelto', async () => {
    mockBuscarPorId.mockResolvedValue({ ...reportePendiente, estado: 'ADVERTIDO' });

    const error = await capturarError(
      useCase.ejecutar(1, { estado: 'SUSPENDIDO' }, ADMIN_ID),
    );

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'REPORT_ALREADY_RESOLVED',
    });
    expect(mockSuspenderUsuario).not.toHaveBeenCalled();
    expect(mockResolver).not.toHaveBeenCalled();
  });

  it('propaga la falla de usuarios-auth y no registra la resolución', async () => {
    mockBuscarPorId.mockResolvedValue(reportePendiente);
    mockSuspenderUsuario.mockRejectedValue(
      new ServiceUnavailableException({
        statusCode: 503,
        code: 'USUARIOS_AUTH_UNAVAILABLE',
      }),
    );

    const error = await capturarError(
      useCase.ejecutar(1, { estado: 'SUSPENDIDO' }, ADMIN_ID),
    );

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(mockResolver).not.toHaveBeenCalled();
  });
});
