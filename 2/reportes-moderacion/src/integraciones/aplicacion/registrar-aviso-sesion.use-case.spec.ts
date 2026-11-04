import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RegistrarAvisoSesionUseCase } from './registrar-aviso-sesion.use-case.js';
import { AVISO_SESION_REPOSITORY } from '../dominio/ports/aviso-sesion.repository.js';
import {
  TIPO_CONFLICTO_DETECTADO,
  TIPO_CONFLICTO_RESUELTO,
} from '../dominio/aviso-sesion.js';

const conflictoValido = {
  origen: 'agendamiento-sesiones',
  version: 1,
  id_aviso: '31',
  fecha_aviso: '2026-10-13T12:00:00.000Z',
  tipo: 'CONFLICTO_DETECTADO',
  id_sesion: '24',
  id_tutor: '9007199254740993',
  id_tutee: '9007199254740995',
  id_materia: '7',
  fecha_conflicto: '2026-10-13T12:00:00.000Z',
  declaraciones: [
    {
      id_declaracion: '50',
      id_usuario: '9007199254740993',
      resultado_declarado: 'COMPLETADA',
      id_usuario_inasistente: null,
      fecha_declaracion: '2026-10-13T11:59:00.000Z',
    },
    {
      id_declaracion: '51',
      id_usuario: '9007199254740995',
      resultado_declarado: 'INASISTENCIA',
      id_usuario_inasistente: '9007199254740993',
      fecha_declaracion: '2026-10-13T12:00:00.000Z',
    },
  ],
};

const resolucionValida = {
  origen: 'agendamiento-sesiones',
  version: 1,
  id_aviso: '32',
  fecha_aviso: '2026-10-13T12:30:00.000Z',
  tipo: 'CONFLICTO_RESUELTO',
  id_sesion: '24',
  id_resolucion: '8',
  id_administrador: '12',
  estado_final: 'COMPLETADA',
  motivo_resolucion: 'Revisión de ambas declaraciones',
  observaciones: null,
  fecha_resolucion: '2026-10-13T12:30:00.000Z',
};

async function capturarError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

function codigo(error: unknown): unknown {
  return (error as BadRequestException).getResponse().code;
}

describe('RegistrarAvisoSesionUseCase', () => {
  let useCase: RegistrarAvisoSesionUseCase;

  const mockRegistrar = vi.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrarAvisoSesionUseCase,
        {
          provide: AVISO_SESION_REPOSITORY,
          useValue: { registrar: mockRegistrar },
        },
      ],
    }).compile();

    useCase = module.get<RegistrarAvisoSesionUseCase>(
      RegistrarAvisoSesionUseCase,
    );
    mockRegistrar.mockResolvedValue({ aviso: {}, duplicado: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registra un aviso de conflicto normalizado', async () => {
    const resultado = await useCase.ejecutar(
      conflictoValido,
      TIPO_CONFLICTO_DETECTADO,
    );

    expect(mockRegistrar).toHaveBeenCalledWith({
      origen: 'agendamiento-sesiones',
      version: 1,
      idAviso: '31',
      fechaAviso: new Date('2026-10-13T12:00:00.000Z'),
      tipo: 'CONFLICTO_DETECTADO',
      idSesion: 24n,
      datos: {
        tipo: 'CONFLICTO_DETECTADO',
        id_sesion: '24',
        id_tutor: '9007199254740993',
        id_tutee: '9007199254740995',
        id_materia: '7',
        fecha_conflicto: '2026-10-13T12:00:00.000Z',
        declaraciones: conflictoValido.declaraciones,
      },
    });
    expect(resultado).toEqual({ id_aviso: '31', duplicado: false });
  });

  it('registra un aviso de resolución normalizado', async () => {
    const resultado = await useCase.ejecutar(
      resolucionValida,
      TIPO_CONFLICTO_RESUELTO,
    );

    expect(mockRegistrar).toHaveBeenCalledWith({
      origen: 'agendamiento-sesiones',
      version: 1,
      idAviso: '32',
      fechaAviso: new Date('2026-10-13T12:30:00.000Z'),
      tipo: 'CONFLICTO_RESUELTO',
      idSesion: 24n,
      datos: {
        tipo: 'CONFLICTO_RESUELTO',
        id_sesion: '24',
        id_resolucion: '8',
        id_administrador: '12',
        estado_final: 'COMPLETADA',
        motivo_resolucion: 'Revisión de ambas declaraciones',
        observaciones: null,
        fecha_resolucion: '2026-10-13T12:30:00.000Z',
      },
    });
    expect(resultado).toEqual({ id_aviso: '32', duplicado: false });
  });

  it('informa cuando el aviso ya estaba registrado', async () => {
    mockRegistrar.mockResolvedValue({ aviso: {}, duplicado: true });

    const resultado = await useCase.ejecutar(
      conflictoValido,
      TIPO_CONFLICTO_DETECTADO,
    );

    expect(resultado).toEqual({ id_aviso: '31', duplicado: true });
  });

  it('rechaza un origen desconocido', async () => {
    const error = await capturarError(
      useCase.ejecutar(
        { ...conflictoValido, origen: 'otro-servicio' },
        TIPO_CONFLICTO_DETECTADO,
      ),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(codigo(error)).toBe('AVISO_PAYLOAD_INVALID');
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('rechaza una versión no soportada', async () => {
    const error = await capturarError(
      useCase.ejecutar(
        { ...conflictoValido, version: 2 },
        TIPO_CONFLICTO_DETECTADO,
      ),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('rechaza un tipo que no corresponde a la ruta', async () => {
    const error = await capturarError(
      useCase.ejecutar(resolucionValida, TIPO_CONFLICTO_DETECTADO),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('rechaza un id_aviso inválido', async () => {
    const error = await capturarError(
      useCase.ejecutar(
        { ...conflictoValido, id_aviso: 'abc' },
        TIPO_CONFLICTO_DETECTADO,
      ),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('rechaza una fecha_aviso inválida', async () => {
    const error = await capturarError(
      useCase.ejecutar(
        { ...conflictoValido, fecha_aviso: 'no-es-fecha' },
        TIPO_CONFLICTO_DETECTADO,
      ),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('rechaza declaraciones vacías', async () => {
    const error = await capturarError(
      useCase.ejecutar(
        { ...conflictoValido, declaraciones: [] },
        TIPO_CONFLICTO_DETECTADO,
      ),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('rechaza un resultado_declarado inválido', async () => {
    const error = await capturarError(
      useCase.ejecutar(
        {
          ...conflictoValido,
          declaraciones: [
            { ...conflictoValido.declaraciones[0], resultado_declarado: 'OTRA' },
          ],
        },
        TIPO_CONFLICTO_DETECTADO,
      ),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('rechaza un estado_final inválido', async () => {
    const error = await capturarError(
      useCase.ejecutar(
        { ...resolucionValida, estado_final: 'CANCELADA' },
        TIPO_CONFLICTO_RESUELTO,
      ),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('rechaza un aviso que no es un objeto', async () => {
    const error = await capturarError(
      useCase.ejecutar('aviso', TIPO_CONFLICTO_DETECTADO),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(mockRegistrar).not.toHaveBeenCalled();
  });
});
