import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ReactivarSuspensionUseCase } from './reactivar-suspension.use-case.js';
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

describe('ReactivarSuspensionUseCase', () => {
  let useCase: ReactivarSuspensionUseCase;

  const mockBuscarPorId = vi.fn();
  const mockReactivar = vi.fn();
  const mockReactivarUsuario = vi.fn();

  const reporteSuspendido = {
    id: 1,
    estado: 'SUSPENDIDO',
    usuarioReportadoId: 2n,
    reactivadoEn: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactivarSuspensionUseCase,
        {
          provide: REPORTE_REPOSITORY,
          useValue: {
            buscarPorId: mockBuscarPorId,
            reactivar: mockReactivar,
          },
        },
        {
          provide: ModeracionUsuariosAuthService,
          useValue: { reactivarUsuario: mockReactivarUsuario },
        },
      ],
    }).compile();

    useCase = module.get<ReactivarSuspensionUseCase>(ReactivarSuspensionUseCase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reactiva al usuario suspendido y registra la reactivación', async () => {
    mockBuscarPorId.mockResolvedValue(reporteSuspendido);
    mockReactivarUsuario.mockResolvedValue({
      id_usuario: '2',
      estado_cuenta: 'ACTIVO',
    });
    mockReactivar.mockResolvedValue({
      ...reporteSuspendido,
      reactivadoEn: new Date(),
    });

    const resultado = await useCase.ejecutar(1, ADMIN_ID);

    expect(mockReactivarUsuario).toHaveBeenCalledWith('2');
    expect(mockReactivar).toHaveBeenCalledWith(1, {
      reactivadoPorId: 9n,
      reactivadoEn: expect.any(Date),
    });
    expect(resultado).toBeDefined();
  });

  it('devuelve 404 cuando el reporte no existe', async () => {
    mockBuscarPorId.mockResolvedValue(null);

    const error = await capturarError(useCase.ejecutar(99, ADMIN_ID));

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toMatchObject({
      code: 'REPORT_NOT_FOUND',
    });
    expect(mockReactivarUsuario).not.toHaveBeenCalled();
  });

  it('rechaza reactivar un reporte que no está suspendido', async () => {
    mockBuscarPorId.mockResolvedValue({ ...reporteSuspendido, estado: 'ADVERTIDO' });

    const error = await capturarError(useCase.ejecutar(1, ADMIN_ID));

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'REPORT_REACTIVATION_INVALID',
    });
    expect(mockReactivarUsuario).not.toHaveBeenCalled();
  });

  it('rechaza reactivar un reporte ya reactivado', async () => {
    mockBuscarPorId.mockResolvedValue({
      ...reporteSuspendido,
      reactivadoEn: new Date(),
    });

    const error = await capturarError(useCase.ejecutar(1, ADMIN_ID));

    expect(error).toBeInstanceOf(ConflictException);
    expect(mockReactivarUsuario).not.toHaveBeenCalled();
    expect(mockReactivar).not.toHaveBeenCalled();
  });

  it('propaga la falla de usuarios-auth y no registra la reactivación', async () => {
    mockBuscarPorId.mockResolvedValue(reporteSuspendido);
    mockReactivarUsuario.mockRejectedValue(
      new ServiceUnavailableException({
        statusCode: 503,
        code: 'USUARIOS_AUTH_UNAVAILABLE',
      }),
    );

    const error = await capturarError(useCase.ejecutar(1, ADMIN_ID));

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(mockReactivar).not.toHaveBeenCalled();
  });
});
