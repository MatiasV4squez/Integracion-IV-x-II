import { BuscarTutoresPorMateriaUseCase } from './buscar-tutores-por-materia.use-case.js';

describe('BuscarTutoresPorMateriaUseCase', () => {
  const repositorio = { buscarHabilitadosPorMateria: vi.fn() };
  const disponibilidad = { consultarPorTutores: vi.fn() };
  const casoDeUso = new BuscarTutoresPorMateriaUseCase(repositorio, disponibilidad);

  beforeEach(() => vi.resetAllMocks());

  it('combina cada tutor con sus propios horarios y conserva los tutores sin horarios', async () => {
    const tutores = [
      { idTutor: '10', promedioCalificaciones: 4.5, cantidadCalificaciones: 4 },
      { idTutor: '15', promedioCalificaciones: null, cantidadCalificaciones: 0 },
    ];
    const horario = { idBloque: '1', dia: '2026-10-10', horaInicio: '09:00', horaFin: '10:00' };
    repositorio.buscarHabilitadosPorMateria.mockResolvedValue(tutores);
    disponibilidad.consultarPorTutores.mockResolvedValue(new Map([['10', [horario]]]));

    await expect(casoDeUso.ejecutar(2n)).resolves.toEqual([
      { ...tutores[0], horariosDisponibles: [horario] },
      { ...tutores[1], horariosDisponibles: [] },
    ]);
    expect(disponibilidad.consultarPorTutores).toHaveBeenCalledExactlyOnceWith(['10', '15']);
  });

  it('no consulta disponibilidad cuando no encuentra tutores', async () => {
    repositorio.buscarHabilitadosPorMateria.mockResolvedValue([]);
    await expect(casoDeUso.ejecutar(2n)).resolves.toEqual([]);
    expect(disponibilidad.consultarPorTutores).not.toHaveBeenCalled();
  });

  it('propaga el fallo de disponibilidad sin anunciar horarios vacios', async () => {
    repositorio.buscarHabilitadosPorMateria.mockResolvedValue([{ idTutor: '10', promedioCalificaciones: null, cantidadCalificaciones: 0 }]);
    const error = new Error('Consulta de disponibilidad fallida');
    disponibilidad.consultarPorTutores.mockRejectedValue(error);
    await expect(casoDeUso.ejecutar(2n)).rejects.toBe(error);
  });
});
