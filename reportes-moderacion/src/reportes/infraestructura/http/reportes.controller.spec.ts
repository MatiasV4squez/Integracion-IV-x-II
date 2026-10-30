import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportesController } from './reportes.controller.js';
import { CrearReporteUseCase } from '../../aplicacion/crear-reporte.use-case.js';
import { ConsultarReportesAdminUseCase } from '../../aplicacion/consultar-reportes-admin.use-case.js';
import { ResolverReporteUseCase } from '../../aplicacion/resolver-reporte.use-case.js';
import { ReactivarSuspensionUseCase } from '../../aplicacion/reactivar-suspension.use-case.js';
import { SESIONES_REPORTE_VALIDATOR } from '../../dominio/ports/sesiones-reporte-validator.js';
import type { RequestConUsuario } from './guards/usuario-jwt.guard.js';

function requestUsuario(sub = '9', roles = ['ADMINISTRADOR']): RequestConUsuario {
  return {
    user: {
      sub,
      jti: 'jti-de-prueba',
      correo_institucional: 'admin@alu.uct.cl',
      roles,
    },
  } as unknown as RequestConUsuario;
}

describe('ReportesController', () => {
  let controller: ReportesController;

  const mockCrear = vi.fn();
  const mockConsultar = vi.fn();
  const mockResolver = vi.fn();
  const mockReactivar = vi.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        { provide: CrearReporteUseCase, useValue: { ejecutar: mockCrear } },
        { provide: ConsultarReportesAdminUseCase, useValue: { ejecutar: mockConsultar } },
        { provide: ResolverReporteUseCase, useValue: { ejecutar: mockResolver } },
        { provide: ReactivarSuspensionUseCase, useValue: { ejecutar: mockReactivar } },
        { provide: SESIONES_REPORTE_VALIDATOR, useValue: {} },
      ],
    }).compile();

    controller = module.get<ReportesController>(ReportesController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delega la creación del reporte tomando el reportador del usuario autenticado', async () => {
    const dto = {
      titulo: 'Comportamiento inapropiado',
      descripcion: 'Detalle del reporte',
      id_sesion: '10',
      id_usuario_reportado: '2',
    };

    await controller.create(dto, requestUsuario('1', ['ESTUDIANTE']));

    expect(mockCrear).toHaveBeenCalledWith({ ...dto, id_usuario_reportador: '1' });
  });

  it('delega la consulta administrativa con los filtros recibidos', async () => {
    const filtros = { estado: 'PENDIENTE', pagina: '2', limite: '10' };

    await controller.consultarParaAdmin(filtros);

    expect(mockConsultar).toHaveBeenCalledWith(filtros);
  });

  it('resuelve el reporte usando el administrador autenticado', async () => {
    const dto = { estado: 'SUSPENDIDO' as const, motivo: 'Reincidencia' };

    await controller.resolver('1', dto, requestUsuario());

    expect(mockResolver).toHaveBeenCalledWith(1, dto, '9');
  });

  it('reactiva la suspensión usando el administrador autenticado', async () => {
    await controller.reactivar('1', requestUsuario());

    expect(mockReactivar).toHaveBeenCalledWith(1, '9');
  });
});
