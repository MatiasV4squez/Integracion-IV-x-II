import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportesController } from './reportes.controller.js';
import { ReportesService } from './reportes.service.js';
import { SESIONES_REPORTE_VALIDATOR } from './ports/sesiones-reporte-validator.js';

describe('ReportesController', () => {
  let controller: ReportesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        { provide: ReportesService, useValue: {} },
        { provide: SESIONES_REPORTE_VALIDATOR, useValue: {} },
      ],
    }).compile();

    controller = module.get<ReportesController>(ReportesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});