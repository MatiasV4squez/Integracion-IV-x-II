import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConsultarReportesAdminUseCase } from './consultar-reportes-admin.use-case.js';
import { REPORTE_CONSULTA_REPOSITORY } from '../dominio/ports/reporte-consulta.repository.js';

async function capturarError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('ConsultarReportesAdminUseCase', () => {
  let useCase: ConsultarReportesAdminUseCase;

  const mockConsultar = vi.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultarReportesAdminUseCase,
        {
          provide: REPORTE_CONSULTA_REPOSITORY,
          useValue: { consultar: mockConsultar },
        },
      ],
    }).compile();

    useCase = module.get<ConsultarReportesAdminUseCase>(
      ConsultarReportesAdminUseCase,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('aplica paginación por defecto y devuelve los metadatos', async () => {
    mockConsultar.mockResolvedValue({ datos: [], total: 0 });

    const resultado = await useCase.ejecutar({});

    expect(mockConsultar).toHaveBeenCalledWith({}, 1, 20);
    expect(resultado).toEqual({
      datos: [],
      paginacion: { pagina: 1, limite: 20, total: 0, total_paginas: 0 },
    });
  });

  it('normaliza el estado y traduce el rango de fechas al filtro del repositorio', async () => {
    mockConsultar.mockResolvedValue({ datos: [], total: 0 });
    const creadoHasta = new Date('2026-01-31T00:00:00.000Z');
    creadoHasta.setUTCHours(23, 59, 59, 999);

    await useCase.ejecutar({
      estado: ' pendiente ',
      fecha_desde: '2026-01-01',
      fecha_hasta: '2026-01-31',
      pagina: '2',
      limite: '10',
    });

    expect(mockConsultar).toHaveBeenCalledWith(
      {
        estado: 'PENDIENTE',
        creadoDesde: new Date('2026-01-01T00:00:00.000Z'),
        creadoHasta,
      },
      2,
      10,
    );
  });

  it('rechaza una pagina inválida', async () => {
    const error = await capturarError(useCase.ejecutar({ pagina: '0' }));

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'REPORT_FILTER_INVALID',
    });
    expect(mockConsultar).not.toHaveBeenCalled();
  });

  it('rechaza un limite mayor al máximo', async () => {
    const error = await capturarError(useCase.ejecutar({ limite: '101' }));

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockConsultar).not.toHaveBeenCalled();
  });

  it('rechaza fecha_desde posterior a fecha_hasta', async () => {
    const error = await capturarError(
      useCase.ejecutar({ fecha_desde: '2026-02-01', fecha_hasta: '2026-01-01' }),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'REPORT_FILTER_INVALID',
    });
  });

  it('rechaza una fecha con formato inválido', async () => {
    const error = await capturarError(
      useCase.ejecutar({ fecha_desde: '01-01-2026' }),
    );

    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('rechaza un estado vacío', async () => {
    const error = await capturarError(useCase.ejecutar({ estado: '   ' }));

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockConsultar).not.toHaveBeenCalled();
  });
});
