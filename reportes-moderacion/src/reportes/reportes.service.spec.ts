import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportesService } from './reportes.service.js';

describe('ReportesService', () => {
  let service: ReportesService;

  // Creamos la función espía de Vitest
  const mockUpdate = vi.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportesService],
    }).compile();

    service = module.get<ReportesService>(ReportesService);

    // Forzamos el simulacro directamente sobre la propiedad prisma del servicio
    // Esto evita que intente conectarse al puerto 5433
    (service as any).prisma = {
      reporte: {
        update: mockUpdate,
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Moderación de Reportes', () => {
    it('debería actualizar el estado a SUSPENDIDO correctamente', async () => {
      const idReporte = 1;
      const resolucion = { estado: 'SUSPENDIDO' as const };
      const reporteSimulado = { id: idReporte, ...resolucion, creadoEn: new Date() };

      // Configuramos qué debe responder el simulacro
      mockUpdate.mockResolvedValue(reporteSimulado);

      const resultado = await service.resolver(idReporte, resolucion);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: idReporte },
        data: { estado: resolucion.estado },
      });
      expect(resultado).toEqual(reporteSimulado);
    });

    it('debería actualizar el estado a DESESTIMADO correctamente', async () => {
      const idReporte = 2;
      const resolucion = { estado: 'DESESTIMADO' as const };
      const reporteSimulado = { id: idReporte, ...resolucion, creadoEn: new Date() };

      mockUpdate.mockResolvedValue(reporteSimulado);

      const resultado = await service.resolver(idReporte, resolucion);

      expect(resultado.estado).toBe('DESESTIMADO');
    });
  });
});