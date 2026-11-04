import { ConsultarDatosPublicosUseCase } from './consultar-datos-publicos.use-case';

describe('Consulta de datos públicos con persistencia sustituida', () => {
  const usuarios = { buscarPorIds: jest.fn() };
  const consultar = new ConsultarDatosPublicosUseCase(usuarios);
  const datos = {
    id: '9007199254740993',
    nombre: 'Ana',
    carrera: null,
    semestre_actual: null,
    biografia: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    usuarios.buscarPorIds.mockResolvedValue([]);
  });

  it('consulta una sola vez, conserva BIGINT y ordena sin duplicados ni inexistentes', async () => {
    usuarios.buscarPorIds.mockResolvedValue([{ ...datos, id: '2' }, datos]);
    await expect(
      consultar.ejecutar([datos.id, '7', '2', '2']),
    ).resolves.toEqual([datos, { ...datos, id: '2' }]);
    expect(usuarios.buscarPorIds).toHaveBeenCalledTimes(1);
    expect(usuarios.buscarPorIds).toHaveBeenCalledWith([
      9007199254740993n,
      7n,
      2n,
    ]);
  });

  it.each(
    [
      [],
      ['0'],
      ['-1'],
      ['1.5'],
      ['01'],
      ['abc'],
      ['9223372036854775808'],
      Array<string>(101).fill('1'),
    ].map((ids) => ({ ids })),
  )('rechaza IDs inválidos antes de consultar: %j', async ({ ids }) => {
    await expect(consultar.ejecutar(ids)).resolves.toBe('IDS_INVALIDOS');
    expect(usuarios.buscarPorIds).not.toHaveBeenCalled();
  });

  it('admite un lote de 100 IDs aunque no encuentre usuarios', async () => {
    await expect(
      consultar.ejecutar(Array.from({ length: 100 }, (_, i) => String(i + 1))),
    ).resolves.toEqual([]);
    expect(usuarios.buscarPorIds).toHaveBeenCalledTimes(1);
  });
});
