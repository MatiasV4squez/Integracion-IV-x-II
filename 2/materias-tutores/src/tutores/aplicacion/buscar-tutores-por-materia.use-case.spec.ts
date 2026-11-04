import { BuscarTutoresPorMateriaUseCase } from './buscar-tutores-por-materia.use-case.js';

describe('BuscarTutoresPorMateriaUseCase', () => {
  const repositorio = { buscarHabilitadosPorMateria: vi.fn() };
  const disponibilidad = { consultarPorTutores: vi.fn() };
  const casoDeUso = new BuscarTutoresPorMateriaUseCase(repositorio, disponibilidad);
  const paginacion = { page: 2, limit: 2 };

  beforeEach(() => vi.resetAllMocks());

  it('combina cada tutor con sus propios horarios y conserva los tutores sin horarios', async () => {
    const tutores = [
      { idTutor: '10', promedioCalificaciones: 4.5, cantidadCalificaciones: 4 },
      { idTutor: '15', promedioCalificaciones: null, cantidadCalificaciones: 0 },
    ];
    const horario = { idBloque: '1', dia: '2026-10-10', horaInicio: '09:00', horaFin: '10:00' };
    repositorio.buscarHabilitadosPorMateria.mockResolvedValue({ items: tutores, total: 5 });
    disponibilidad.consultarPorTutores.mockResolvedValue(new Map([['10', [horario]]]));

    await expect(casoDeUso.ejecutar(2n, paginacion)).resolves.toEqual({
      items: [
        { ...tutores[0], horariosDisponibles: [horario] },
        { ...tutores[1], horariosDisponibles: [] },
      ],
      total: 5,
      page: 2,
      limit: 2,
      totalPages: 3,
    });
    expect(repositorio.buscarHabilitadosPorMateria).toHaveBeenCalledExactlyOnceWith(2n, paginacion);
    expect(disponibilidad.consultarPorTutores).toHaveBeenCalledExactlyOnceWith(['10', '15']);
  });

  it('no consulta disponibilidad cuando no encuentra tutores', async () => {
    repositorio.buscarHabilitadosPorMateria.mockResolvedValue({ items: [], total: 0 });
    await expect(casoDeUso.ejecutar(2n, paginacion)).resolves.toEqual({
      items: [],
      total: 0,
      page: 2,
      limit: 2,
      totalPages: 0,
    });
    expect(disponibilidad.consultarPorTutores).not.toHaveBeenCalled();
  });

  it('propaga el fallo de disponibilidad sin anunciar horarios vacios', async () => {
    repositorio.buscarHabilitadosPorMateria.mockResolvedValue({ items: [{ idTutor: '10', promedioCalificaciones: null, cantidadCalificaciones: 0 }], total: 1 });
    const error = new Error('Consulta de disponibilidad fallida');
    disponibilidad.consultarPorTutores.mockRejectedValue(error);
    await expect(casoDeUso.ejecutar(2n, paginacion)).rejects.toBe(error);
  });

  it('conserva el total al solicitar una página fuera de los resultados', async () => {
    repositorio.buscarHabilitadosPorMateria.mockResolvedValue({ items: [], total: 23 });
    await expect(casoDeUso.ejecutar(2n, { page: 4, limit: 10 })).resolves.toEqual({
      items: [],
      total: 23,
      page: 4,
      limit: 10,
      totalPages: 3,
    });
    expect(disponibilidad.consultarPorTutores).not.toHaveBeenCalled();
  });

  it('no agrega una página extra cuando el total es múltiplo del límite', async () => {
    repositorio.buscarHabilitadosPorMateria.mockResolvedValue({ items: [], total: 20 });
    await expect(casoDeUso.ejecutar(2n, { page: 3, limit: 10 })).resolves.toMatchObject({ totalPages: 2 });
  });

  it('propaga fallos del repositorio sin consultar disponibilidad', async () => {
    const error = new Error('Fallo del repositorio');
    repositorio.buscarHabilitadosPorMateria.mockRejectedValue(error);
    await expect(casoDeUso.ejecutar(2n, paginacion)).rejects.toBe(error);
    expect(disponibilidad.consultarPorTutores).not.toHaveBeenCalled();
  });
});
