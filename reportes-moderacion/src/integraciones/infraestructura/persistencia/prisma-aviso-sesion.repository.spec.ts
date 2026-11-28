import { describe, it, expect, vi, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { PrismaAvisoSesionRepository } from './prisma-aviso-sesion.repository.js';
import type { PrismaService } from '../../../compartido/prisma.service.js';
import type { DatosNuevoAvisoSesion } from '../../dominio/ports/aviso-sesion.repository.js';

const filaAviso = {
  id: 1,
  origen: 'agendamiento-sesiones',
  version: 1,
  idAviso: '31',
  fechaAviso: new Date('2026-10-13T12:00:00.000Z'),
  tipo: 'CONFLICTO_DETECTADO',
  idSesion: 24n,
  datos: {
    tipo: 'CONFLICTO_DETECTADO' as const,
    id_sesion: '24',
    id_tutor: '42',
    id_tutee: '99',
    id_materia: '7',
    fecha_conflicto: '2026-10-13T12:00:00.000Z',
    declaraciones: [],
  },
  creadoEn: new Date('2026-10-13T12:00:01.000Z'),
};

const datosNuevos: DatosNuevoAvisoSesion = {
  origen: 'agendamiento-sesiones',
  version: 1,
  idAviso: '31',
  fechaAviso: new Date('2026-10-13T12:00:00.000Z'),
  tipo: 'CONFLICTO_DETECTADO',
  idSesion: 24n,
  datos: filaAviso.datos,
};

function prismaSimulado() {
  const create = vi.fn();
  const findUnique = vi.fn();
  const createMany = vi.fn();
  const transaccion = { avisoSesion: { create }, notificacion: { createMany } };
  const prisma = {
    avisoSesion: { findUnique },
    $transaction: (operacion: (cliente: typeof transaccion) => unknown) =>
      operacion(transaccion),
  } as unknown as PrismaService;
  return { prisma, create, findUnique, createMany };
}

function errorUnicidad(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`idAviso`)',
    { code: 'P2002', clientVersion: '5.22.0' },
  );
}

async function capturarError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('PrismaAvisoSesionRepository', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('guarda el conflicto y notifica a los dos participantes', async () => {
    const { prisma, create, findUnique, createMany } = prismaSimulado();
    create.mockResolvedValue(filaAviso);

    const repository = new PrismaAvisoSesionRepository(prisma);
    const resultado = await repository.registrar(datosNuevos);

    expect(create).toHaveBeenCalledWith({
      data: {
        origen: 'agendamiento-sesiones',
        version: 1,
        idAviso: '31',
        fechaAviso: new Date('2026-10-13T12:00:00.000Z'),
        tipo: 'CONFLICTO_DETECTADO',
        idSesion: 24n,
        datos: filaAviso.datos,
      },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          usuarioId: 42n,
          tipo: 'CONFLICTO_DETECTADO',
          mensaje: 'El cierre de tu tutoría #24 está en revisión.',
        },
        {
          usuarioId: 99n,
          tipo: 'CONFLICTO_DETECTADO',
          mensaje: 'El cierre de tu tutoría #24 está en revisión.',
        },
      ],
    });
    expect(findUnique).not.toHaveBeenCalled();
    expect(resultado.duplicado).toBe(false);
    expect(resultado.aviso).toEqual(filaAviso);
  });

  it('devuelve el aviso existente ante una violación de unicidad', async () => {
    const { prisma, create, findUnique, createMany } = prismaSimulado();
    create.mockRejectedValue(errorUnicidad());
    findUnique.mockResolvedValue(filaAviso);

    const repository = new PrismaAvisoSesionRepository(prisma);
    const resultado = await repository.registrar(datosNuevos);

    expect(findUnique).toHaveBeenCalledWith({ where: { idAviso: '31' } });
    expect(createMany).not.toHaveBeenCalled();
    expect(resultado).toEqual({ aviso: filaAviso, duplicado: true });
  });

  it('propaga la violación de unicidad cuando el aviso no aparece', async () => {
    const { prisma, create, findUnique } = prismaSimulado();
    create.mockRejectedValue(errorUnicidad());
    findUnique.mockResolvedValue(null);

    const repository = new PrismaAvisoSesionRepository(prisma);
    const error = await capturarError(repository.registrar(datosNuevos));

    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it('propaga otros errores de la base de datos', async () => {
    const { prisma, create, findUnique } = prismaSimulado();
    const fallo = new Error('fallo de conexión');
    create.mockRejectedValue(fallo);

    const repository = new PrismaAvisoSesionRepository(prisma);
    const error = await capturarError(repository.registrar(datosNuevos));

    expect(error).toBe(fallo);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
