import { CambiarEstadoBloqueUseCase } from './cambiar-estado-bloque.use-case.js';

describe('CambiarEstadoBloqueUseCase', () => {
  it.each(['RESERVADO', 'DISPONIBLE'] as const)('cambia a %s mediante una escritura condicional', async (estado) => {
    const anterior = estado === 'RESERVADO' ? 'DISPONIBLE' : 'RESERVADO';
    const bloques = { buscarEstado: vi.fn().mockResolvedValue(anterior), cambiarSiEstado: vi.fn().mockResolvedValue(true) };
    await expect(new CambiarEstadoBloqueUseCase(bloques).ejecutar(1n, estado)).resolves.toEqual({ idBloque: 1n, estadoBloque: estado });
    expect(bloques.cambiarSiEstado).toHaveBeenCalledWith(1n, anterior, estado);
  });

  it.each(['RESERVADO', 'DISPONIBLE'] as const)('no vuelve a escribir si ya está %s', async (estado) => {
    const bloques = { buscarEstado: vi.fn().mockResolvedValue(estado), cambiarSiEstado: vi.fn() };
    await expect(new CambiarEstadoBloqueUseCase(bloques).ejecutar(1n, estado)).resolves.toEqual({ idBloque: 1n, estadoBloque: estado });
    expect(bloques.cambiarSiEstado).not.toHaveBeenCalled();
  });

  it('conserva el éxito idempotente cuando otro proceso completó el mismo cambio', async () => {
    const bloques = { buscarEstado: vi.fn().mockResolvedValueOnce('DISPONIBLE').mockResolvedValueOnce('RESERVADO'), cambiarSiEstado: vi.fn().mockResolvedValue(false) };
    await expect(new CambiarEstadoBloqueUseCase(bloques).ejecutar(1n, 'RESERVADO')).resolves.toMatchObject({ estadoBloque: 'RESERVADO' });
  });

  it('informa un bloque inexistente sin escribir', async () => {
    const bloques = { buscarEstado: vi.fn().mockResolvedValue(null), cambiarSiEstado: vi.fn() };
    await expect(new CambiarEstadoBloqueUseCase(bloques).ejecutar(1n, 'RESERVADO')).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect(bloques.cambiarSiEstado).not.toHaveBeenCalled();
  });

  it('no convierte un cambio incompatible o una eliminación concurrente en éxito', async () => {
    for (const actual of ['INACTIVO', null]) {
      const bloques = { buscarEstado: vi.fn().mockResolvedValueOnce('DISPONIBLE').mockResolvedValueOnce(actual), cambiarSiEstado: vi.fn().mockResolvedValue(false) };
      await expect(new CambiarEstadoBloqueUseCase(bloques).ejecutar(1n, 'RESERVADO')).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    }
  });
});
