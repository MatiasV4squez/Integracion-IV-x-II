import { PrismaService } from '../database/prisma.service.js';
import { IntegracionesService } from './integraciones.service.js';

describe('IntegracionesService', () => {
  const prisma = {
    bloqueHorario: { findUnique: vi.fn(), updateMany: vi.fn() },
    tutorMateria: { findFirst: vi.fn() },
    calificacionTutorProcesada: { findUnique: vi.fn(), create: vi.fn() },
    perfilTutor: {
      upsert: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  let servicio: IntegracionesService;

  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (operacion: (tx: unknown) => Promise<unknown>) => operacion(prisma),
    );
    servicio = new IntegracionesService(prisma as unknown as PrismaService);
  });

  it('reserva solo un bloque disponible', async () => {
    prisma.bloqueHorario.findUnique.mockResolvedValue({
      idBloque: 1n,
      estadoBloque: 'DISPONIBLE',
    });
    prisma.bloqueHorario.updateMany.mockResolvedValue({ count: 1 });
    await expect(
      servicio.cambiarEstadoBloque(1n, 'RESERVADO'),
    ).resolves.toEqual({ idBloque: '1', estadoBloque: 'RESERVADO' });
    expect(prisma.bloqueHorario.updateMany).toHaveBeenCalledWith({
      where: { idBloque: 1n, estadoBloque: 'DISPONIBLE' },
      data: { estadoBloque: 'RESERVADO' },
    });
  });

  it('impide reservar un bloque inactivo o cambiado concurrentemente', async () => {
    prisma.bloqueHorario.findUnique.mockResolvedValue({
      idBloque: 1n,
      estadoBloque: 'INACTIVO',
    });
    prisma.bloqueHorario.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      servicio.cambiarEstadoBloque(1n, 'RESERVADO'),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('calcula reputación global y marca revisión tras tres notas bajas', async () => {
    prisma.tutorMateria.findFirst.mockResolvedValue({ idTutorMateria: 1n });
    prisma.calificacionTutorProcesada.findUnique.mockResolvedValue(null);
    prisma.perfilTutor.upsert.mockResolvedValue({
      idUsuario: 10n,
      cantidadCalificaciones: 3,
      sumaCalificaciones: 7,
      estado: 'ACTIVO',
    });
    prisma.perfilTutor.update.mockResolvedValue({
      idUsuario: 10n,
      cantidadCalificaciones: 3,
      sumaCalificaciones: 7,
      estado: 'EN_REVISION',
    });
    await expect(servicio.registrarCalificacion(10n, 1n, 2)).resolves.toEqual({
      idTutor: '10',
      cantidadCalificaciones: 3,
      promedio: 7 / 3,
      estado: 'EN_REVISION',
    });
    expect(prisma.perfilTutor.update).toHaveBeenCalledWith({
      where: { idUsuario: 10n },
      data: { estado: 'EN_REVISION' },
    });
  });

  it('no cuenta dos veces un mismo evento', async () => {
    prisma.tutorMateria.findFirst.mockResolvedValue({ idTutorMateria: 1n });
    prisma.calificacionTutorProcesada.findUnique.mockResolvedValue({
      idCalificacion: 1n,
      idTutor: 10n,
      puntuacion: 5,
    });
    prisma.perfilTutor.findUniqueOrThrow.mockResolvedValue({
      idUsuario: 10n,
      cantidadCalificaciones: 1,
      sumaCalificaciones: 5,
      estado: 'ACTIVO',
    });
    await expect(
      servicio.registrarCalificacion(10n, 1n, 5),
    ).resolves.toMatchObject({ promedio: 5, cantidadCalificaciones: 1 });
    expect(prisma.calificacionTutorProcesada.create).not.toHaveBeenCalled();
  });

  it('conserva la revisión aunque una nota posterior eleve el promedio', async () => {
    prisma.tutorMateria.findFirst.mockResolvedValue({ idTutorMateria: 1n });
    prisma.calificacionTutorProcesada.findUnique.mockResolvedValue(null);
    prisma.perfilTutor.upsert.mockResolvedValue({
      idUsuario: 10n,
      cantidadCalificaciones: 4,
      sumaCalificaciones: 10,
      estado: 'EN_REVISION',
    });
    prisma.perfilTutor.update.mockResolvedValue({
      idUsuario: 10n,
      cantidadCalificaciones: 4,
      sumaCalificaciones: 10,
      estado: 'EN_REVISION',
    });
    await servicio.registrarCalificacion(10n, 2n, 5);
    expect(prisma.perfilTutor.update).toHaveBeenCalledWith({
      where: { idUsuario: 10n },
      data: { estado: 'EN_REVISION' },
    });
  });
});
