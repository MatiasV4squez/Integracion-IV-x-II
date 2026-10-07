import type { PrismaService } from '../../database/prisma.service.js';
import { PrismaTutoresRepository } from './prisma-tutores.repository.js';

describe('PrismaTutoresRepository', () => {
  const prisma = {
    tutorMateria: { findMany: vi.fn(), count: vi.fn() },
    perfilTutor: { findMany: vi.fn() },
  };
  let repositorio: PrismaTutoresRepository;
  const paginacion = { page: 1, limit: 10 };

  beforeEach(() => {
    vi.resetAllMocks();
    prisma.tutorMateria.findMany.mockResolvedValue([]);
    prisma.perfilTutor.findMany.mockResolvedValue([]);
    prisma.tutorMateria.count.mockResolvedValue(0);
    repositorio = new PrismaTutoresRepository(prisma as unknown as PrismaService);
  });

  it('consulta solo habilitaciones vigentes de la materia solicitada', async () => {
    prisma.tutorMateria.findMany.mockResolvedValue([{ idUsuario: 10n }, { idUsuario: 15n }]);

    await repositorio.buscarHabilitadosPorMateria(2n, paginacion);

    expect(prisma.tutorMateria.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { idMateria: 2n, vigente: true },
      select: { idUsuario: true },
      skip: 0,
      take: 10,
      orderBy: { idTutorMateria: 'asc' },
    });
    expect(prisma.perfilTutor.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { idUsuario: { in: [10n, 15n] } },
      select: {
        idUsuario: true,
        sumaCalificaciones: true,
        cantidadCalificaciones: true,
      },
    });
  });

  it('asocia cada perfil por usuario y calcula su promedio', async () => {
    prisma.tutorMateria.findMany.mockResolvedValue([{ idUsuario: 10n }, { idUsuario: 15n }]);
    prisma.perfilTutor.findMany.mockResolvedValue([
      { idUsuario: 15n, sumaCalificaciones: 7, cantidadCalificaciones: 2 },
      { idUsuario: 10n, sumaCalificaciones: 18, cantidadCalificaciones: 4 },
    ]);

    await expect(repositorio.buscarHabilitadosPorMateria(2n, paginacion)).resolves.toMatchObject({
      items: [
        { idTutor: '10', promedioCalificaciones: 4.5, cantidadCalificaciones: 4 },
        { idTutor: '15', promedioCalificaciones: 3.5, cantidadCalificaciones: 2 },
      ],
    });
  });

  it('conserva al tutor sin perfil y devuelve cantidad cero y promedio null', async () => {
    prisma.tutorMateria.findMany.mockResolvedValue([{ idUsuario: 10n }]);

    await expect(repositorio.buscarHabilitadosPorMateria(2n, paginacion)).resolves.toMatchObject({ items: [{ idTutor: '10', promedioCalificaciones: null, cantidadCalificaciones: 0 }] });
  });

  it('devuelve promedio null cuando el perfil no tiene calificaciones', async () => {
    prisma.tutorMateria.findMany.mockResolvedValue([{ idUsuario: 10n }]);
    prisma.perfilTutor.findMany.mockResolvedValue([{ idUsuario: 10n, sumaCalificaciones: 0, cantidadCalificaciones: 0 }]);

    await expect(repositorio.buscarHabilitadosPorMateria(2n, paginacion)).resolves.toMatchObject({ items: [{ idTutor: '10', promedioCalificaciones: null, cantidadCalificaciones: 0 }] });
  });

  it('devuelve una lista vacia cuando no hay tutores habilitados', async () => {
    await expect(repositorio.buscarHabilitadosPorMateria(2n, paginacion)).resolves.toEqual({ items: [], total: 0 });
  });

  it('conserva la precision de identificadores mayores al entero seguro de JavaScript', async () => {
    prisma.tutorMateria.findMany.mockResolvedValue([{ idUsuario: 9007199254740993n }]);

    await expect(repositorio.buscarHabilitadosPorMateria(2n, paginacion)).resolves.toMatchObject({
      items: [
        {
          idTutor: '9007199254740993',
          promedioCalificaciones: null,
          cantidadCalificaciones: 0,
        },
      ],
    });
  });

  it('propaga los errores de consulta sin convertirlos en una lista vacia', async () => {
    const error = new Error('Fallo de consulta');
    prisma.tutorMateria.findMany.mockRejectedValue(error);

    await expect(repositorio.buscarHabilitadosPorMateria(2n, paginacion)).rejects.toBe(error);
    expect(prisma.perfilTutor.findMany).not.toHaveBeenCalled();
  });

  it('propaga los errores al consultar perfiles', async () => {
    prisma.tutorMateria.findMany.mockResolvedValue([{ idUsuario: 10n }]);
    const error = new Error('Fallo de perfiles');
    prisma.perfilTutor.findMany.mockRejectedValue(error);

    await expect(repositorio.buscarHabilitadosPorMateria(2n, paginacion)).rejects.toBe(error);
  });

  it('pagina antes de consultar perfiles y cuenta todas las coincidencias con los mismos filtros', async () => {
    prisma.tutorMateria.findMany.mockResolvedValue([{ idUsuario: 30n }]);
    prisma.tutorMateria.count.mockResolvedValue(23);
    await expect(repositorio.buscarHabilitadosPorMateria(2n, { page: 3, limit: 10 })).resolves.toEqual({
      items: [{ idTutor: '30', promedioCalificaciones: null, cantidadCalificaciones: 0 }],
      total: 23,
    });
    expect(prisma.tutorMateria.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { idMateria: 2n, vigente: true },
      select: { idUsuario: true },
      skip: 20,
      take: 10,
      orderBy: { idTutorMateria: 'asc' },
    });
    expect(prisma.tutorMateria.count).toHaveBeenCalledExactlyOnceWith({ where: { idMateria: 2n, vigente: true } });
    expect(prisma.perfilTutor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idUsuario: { in: [30n] } },
      }),
    );
  });

  it('conserva el total cuando la página no contiene tutores', async () => {
    prisma.tutorMateria.count.mockResolvedValue(23);
    await expect(repositorio.buscarHabilitadosPorMateria(2n, { page: 4, limit: 10 })).resolves.toEqual({ items: [], total: 23 });
  });

  it('propaga errores del conteo sin devolver un total inventado', async () => {
    const error = new Error('Fallo del conteo');
    prisma.tutorMateria.count.mockRejectedValue(error);
    await expect(repositorio.buscarHabilitadosPorMateria(2n, paginacion)).rejects.toBe(error);
    expect(prisma.perfilTutor.findMany).not.toHaveBeenCalled();
  });
});
