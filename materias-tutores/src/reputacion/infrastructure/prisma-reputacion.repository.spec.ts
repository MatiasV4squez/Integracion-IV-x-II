import type { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaReputacionRepository } from './prisma-reputacion.repository.js';

describe('PrismaReputacionRepository', () => {
  const tx = {
    tutorMateria: { findFirst: vi.fn() },
    perfilTutor: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    calificacionTutorProcesada: { findUnique: vi.fn(), create: vi.fn() },
  };
  const prisma = { ...tx, $transaction: vi.fn() };
  const repositorio = new PrismaReputacionRepository(prisma as unknown as PrismaService);
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((operacion: (tx: unknown) => Promise<unknown>) => operacion(tx));
  });
  it('usa Serializable y ejecuta el contrato dentro de la transacción', async () => {
    tx.perfilTutor.upsert.mockResolvedValue({ idUsuario: 10n, sumaCalificaciones: 5, cantidadCalificaciones: 1, estado: 'ACTIVO' });
    await expect(
      repositorio.ejecutarTransaccion(async (unidad) => {
        await unidad.registrarEvento({ idTutor: 10n, idCalificacion: 42n, puntuacion: 5 });
        const perfil = await unidad.acumularCalificacion(10n, 5);
        await unidad.guardarEstado(10n, 'ACTIVO');
        return perfil;
      }),
    ).resolves.toMatchObject({ idTutor: 10n, sumaCalificaciones: 5 });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(tx.perfilTutor.upsert).toHaveBeenCalledWith({
      where: { idUsuario: 10n },
      create: { idUsuario: 10n, sumaCalificaciones: 5, cantidadCalificaciones: 1 },
      update: { cantidadCalificaciones: { increment: 1 }, sumaCalificaciones: { increment: 5 } },
    });
  });
  it.each(['P2034', 'P2002'])('reintenta conflictos %s', async (code) => {
    prisma.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('conflicto', { code, clientVersion: 'test' }));
    await expect(repositorio.ejecutarTransaccion(async () => 'ok')).resolves.toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
  it.each(['40001', '40P01'])('reintenta errores PostgreSQL del adaptador %s', async (originalCode) => {
    prisma.$transaction.mockRejectedValueOnce({ cause: { originalCode } });
    await expect(repositorio.ejecutarTransaccion(async () => 'ok')).resolves.toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
  it('limita reintentos a tres y devuelve conflicto de aplicación', async () => {
    prisma.$transaction.mockRejectedValue({ code: '40001' });
    await expect(repositorio.ejecutarTransaccion(async () => 'ok')).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });
  it('reconoce SQLSTATE dentro de los metadatos del adaptador Prisma', async () => {
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('conflicto', {
        code: 'P2039',
        clientVersion: 'test',
        meta: { driverAdapterError: { cause: { originalCode: '40001' } } },
      }),
    );
    await expect(repositorio.ejecutarTransaccion(async () => 'ok')).resolves.toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
  it('no reintenta fallos ajenos a concurrencia', async () => {
    const error = new Error('sin conexión');
    prisma.$transaction.mockRejectedValue(error);
    await expect(repositorio.ejecutarTransaccion(async () => 'ok')).rejects.toBe(error);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('no normaliza silenciosamente estados inválidos almacenados', async () => {
    tx.perfilTutor.findUnique.mockResolvedValue({ idUsuario: 10n, sumaCalificaciones: 0, cantidadCalificaciones: 0, estado: 'OTRO' });
    await expect(repositorio.consultarPerfil(10n)).rejects.toThrow('Estado de reputación almacenado inválido.');
  });
});
