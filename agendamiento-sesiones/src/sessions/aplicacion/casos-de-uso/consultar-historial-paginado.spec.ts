import { ConsultarHistorialPaginado } from './consultar-historial-paginado';
import type { EntradaHistorialPaginado } from '../contratos/historial-paginado';

describe('Historial paginado mediante un puerto', () => {
  let consultar: jest.Mock;
  let caso: ConsultarHistorialPaginado;

  beforeEach(() => {
    consultar = jest.fn().mockResolvedValue({ items: [], total: 0 });
    caso = new ConsultarHistorialPaginado({ consultar });
  });

  it('usa la identidad BIGINT y los valores por defecto sin filtrar por un rol global', async () => {
    const resultado = await caso.ejecutar('9007199254740993');
    expect(consultar).toHaveBeenCalledWith({
      idUsuario: 9007199254740993n, page: 1, limit: 20, rol: undefined, estado: undefined,
    });
    expect(resultado).toEqual({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it('envía todos los filtros al almacenamiento y calcula páginas con redondeo superior', async () => {
    consultar.mockResolvedValue({ items: [], total: 21 });
    expect(await caso.ejecutar('2', { page: '2', limit: '10', rol: 'TUTOR', estado: 'COMPLETADA' }))
      .toEqual({ items: [], total: 21, page: 2, limit: 10, totalPages: 3 });
    expect(consultar).toHaveBeenCalledWith({ idUsuario: 2n, page: 2, limit: 10, rol: 'TUTOR', estado: 'COMPLETADA' });
  });

  it('no convierte una página vacía en otra página ni pierde el total', async () => {
    consultar.mockResolvedValue({ items: [], total: 3 });
    expect(await caso.ejecutar('2', { page: '9', limit: '2' }))
      .toEqual({ items: [], total: 3, page: 9, limit: 2, totalPages: 2 });
  });

  it('acepta los límites documentados sin desbordar el desplazamiento', async () => {
    await caso.ejecutar('2', { page: '1000000', limit: '100' });
    expect(consultar).toHaveBeenCalledWith(expect.objectContaining({ page: 1000000, limit: 100 }));
  });

  it.each(['0', '-1', '9223372036854775808', 'no-es-id'])('rechaza la identidad inválida %s', async (id) => {
    await expect(caso.ejecutar(id)).rejects.toMatchObject({ motivo: 'ENTRADA_INVALIDA' });
    expect(consultar).not.toHaveBeenCalled();
  });

  it.each([
    { page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '01' }, { page: '1e2' },
    { page: ' 1' }, { page: '' }, { page: '1000001' }, { limit: '101' }, { limit: '0' },
    { limit: '2.5' }, { limit: '' }, { limit: '0x10' }, { page: null }, { limit: 20 },
    { page: ['1', '2'] }, { rol: 'ADMINISTRADOR' }, { rol: 'tutor' }, { rol: '' },
    { estado: 'INVENTADO' }, { estado: ['PENDIENTE', 'COMPLETADA'] },
  ])('rechaza filtros o paginación inválidos: %j', async (entrada) => {
    await expect(caso.ejecutar('2', entrada as unknown as EntradaHistorialPaginado))
      .rejects.toMatchObject({ motivo: 'ENTRADA_INVALIDA' });
    expect(consultar).not.toHaveBeenCalled();
  });

  it('propaga el fallo del repositorio sin presentar una página vacía como éxito', async () => {
    const error = new Error('Sin conexión');
    consultar.mockRejectedValue(error);
    await expect(caso.ejecutar('2')).rejects.toBe(error);
  });
});
