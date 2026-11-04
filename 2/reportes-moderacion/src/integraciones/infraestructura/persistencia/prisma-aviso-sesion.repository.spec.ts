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
  datos: { tipo: 'CONFLICTO_DETECTADO', id_sesion: '24' },
  creadoEn: new Date('2026-10-13T12:00:01.000Z'),
};

const datosNuevos: DatosNuevoAvisoSesion = {
  origen: 'agendamiento-sesiones',
  version: 1,
  idAviso: '31',
  fechaAviso: new Date('2026-10-13T12:00:00.000Z'),
  tipo: 'CONFLICTO_DETECTADO',
  idSesion: 24n,
  datos: { tipo: 'CONFLICTO_DETECTADO', id_sesion: '24' } as never,
};

function prismaSimulado() {
  const create = vi.fn();
  const findUnique = vi.fn();
  const prisma = { avisoSesion: { create, findUnique } } as unknown as PrismaService;
  return { prisma, create, findUnique };
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

  it('crea el aviso y lo devuelve como entidad de dominio', async () => {
    const { prisma, create, findUnique } = prismaSimulado();
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
        datos: { tipo: 'CONFLICTO_DETECTADO', id_sesion: '24' },
      },
    });
    expect(findUnique).not.toHaveBeenCalled();
    expect(resultado.duplicado).toBe(false);
    expect(resultado.aviso).toEqual(filaAviso);
  });

  it('devuelve el aviso existente ante una violación de unicidad', async () => {
    const { prisma, create, findUnique } = prismaSimulado();
    create.mockRejectedValue(errorUnicidad());
    findUnique.mockResolvedValue(filaAviso);

    const repository = new PrismaAvisoSesionRepository(prisma);
    const resultado = await repository.registrar(datosNuevos);

    expect(findUnique).toHaveBeenCalledWith({ where: { idAviso: '31' } });
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
