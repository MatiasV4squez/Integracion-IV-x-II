import { ListarMateriasUseCase } from './listar-materias.use-case.js';
import type { MateriasRepository } from './puertos/materias.repository.js';

describe('ListarMateriasUseCase', () => {
  it('consulta el catálogo usando un repositorio sin Nest ni Prisma', async () => {
    const materias = [{ idMateria: 1n, codigo: 'INFO1126', nombre: 'PROGRAMACIÓN III' }];
    const listarCatalogo = vi.fn().mockResolvedValue(materias);
    const repositorio: MateriasRepository = { listarCatalogo };
    const casoDeUso = new ListarMateriasUseCase(repositorio);
    await expect(casoDeUso.ejecutar()).resolves.toEqual(materias);
    expect(listarCatalogo).toHaveBeenCalledOnce();
  });

  it('permite un catálogo vacío', async () => {
    const casoDeUso = new ListarMateriasUseCase({ listarCatalogo: async () => [] });
    await expect(casoDeUso.ejecutar()).resolves.toEqual([]);
  });

  it('propaga el fallo del repositorio sin inventar un catálogo vacío', async () => {
    const error = new Error('No se pudo consultar el catálogo');
    const casoDeUso = new ListarMateriasUseCase({
      listarCatalogo: async () => {
        throw error;
      },
    });
    await expect(casoDeUso.ejecutar()).rejects.toBe(error);
  });
});
