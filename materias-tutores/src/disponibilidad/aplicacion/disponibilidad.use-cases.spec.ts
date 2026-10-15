import { CrearBloqueUseCase } from './crear-bloque.use-case.js';
import { ListarBloquesUseCase } from './listar-bloques.use-case.js';
import { ConsultarDisponibilidadTutorUseCase } from './consultar-disponibilidad-tutor.use-case.js';
import { ActualizarBloqueUseCase } from './actualizar-bloque.use-case.js';
import { DesactivarBloqueUseCase } from './desactivar-bloque.use-case.js';
import type { DisponibilidadRepository } from './puertos/disponibilidad.repository.js';

describe('Casos de uso de disponibilidad sin Nest ni Prisma', () => {
  const bloque = { idBloque: 1n, idTutor: 10n, dia: '2026-10-01', horaInicio: '09:00', horaFin: '10:00', estadoBloque: 'DISPONIBLE' };
  const horario = { dia: bloque.dia, horaInicio: bloque.horaInicio, horaFin: bloque.horaFin };
  const repositorio = {
    listarActivosDelDia: vi.fn(),
    crear: vi.fn(),
    listarPropios: vi.fn(),
    consultarDisponibles: vi.fn(),
    buscarPropio: vi.fn(),
    actualizarDisponible: vi.fn(),
    desactivarDisponible: vi.fn(),
  } satisfies DisponibilidadRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    repositorio.listarActivosDelDia.mockResolvedValue([]);
    repositorio.crear.mockResolvedValue(bloque);
    repositorio.buscarPropio.mockResolvedValue(bloque);
  });

  it('crea con el tutor indicado y un horario validado', async () => {
    await expect(new CrearBloqueUseCase(repositorio).ejecutar(10n, horario)).resolves.toEqual(bloque);
    expect(repositorio.listarActivosDelDia).toHaveBeenCalledWith(10n, horario.dia);
    expect(repositorio.crear).toHaveBeenCalledWith(10n, horario);
  });
  it('rechaza formatos inválidos antes de consultar persistencia', async () => {
    await expect(new CrearBloqueUseCase(repositorio).ejecutar(10n, { ...horario, horaInicio: '9:00' })).rejects.toMatchObject({ codigo: 'ENTRADA_INVALIDA' });
    expect(repositorio.listarActivosDelDia).not.toHaveBeenCalled();
    expect(repositorio.crear).not.toHaveBeenCalled();
  });
  it('rechaza una creación solapada con un bloque activo', async () => {
    repositorio.listarActivosDelDia.mockResolvedValue([{ ...bloque, estadoBloque: 'RESERVADO' }]);
    await expect(new CrearBloqueUseCase(repositorio).ejecutar(10n, horario)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    expect(repositorio.crear).not.toHaveBeenCalled();
  });
  it('admite horarios adyacentes', async () => {
    repositorio.listarActivosDelDia.mockResolvedValue([{ ...bloque, horaInicio: '10:00', horaFin: '11:00' }]);
    await new CrearBloqueUseCase(repositorio).ejecutar(10n, horario);
    expect(repositorio.crear).toHaveBeenCalledOnce();
  });
  it('lista los bloques propios sin aplicar el filtro público', async () => {
    repositorio.listarPropios.mockResolvedValue([{ ...bloque, estadoBloque: 'INACTIVO' }]);
    await expect(new ListarBloquesUseCase(repositorio).ejecutar(10n)).resolves.toEqual([{ ...bloque, estadoBloque: 'INACTIVO' }]);
    expect(repositorio.listarPropios).toHaveBeenCalledWith(10n);
  });
  it('consulta disponibilidad con un reloj sustituible y zona Santiago', async () => {
    repositorio.consultarDisponibles.mockResolvedValue([]);
    const caso = new ConsultarDisponibilidadTutorUseCase(repositorio, { ahora: () => new Date('2026-06-01T12:30:00Z') });
    await expect(caso.ejecutar(9007199254740993n)).resolves.toEqual([]);
    expect(repositorio.consultarDisponibles).toHaveBeenCalledWith(9007199254740993n, { dia: '2026-06-01', hora: '08:30' });
  });
  it('actualiza solo el campo indicado y conserva los demás', async () => {
    repositorio.actualizarDisponible.mockResolvedValue({ ...bloque, horaFin: '10:30' });
    await expect(new ActualizarBloqueUseCase(repositorio).ejecutar(10n, 1n, { horaFin: '10:30' })).resolves.toMatchObject({ horaFin: '10:30' });
    expect(repositorio.buscarPropio).toHaveBeenCalledWith(10n, 1n);
    expect(repositorio.actualizarDisponible).toHaveBeenCalledWith(10n, 1n, { ...horario, horaFin: '10:30' });
  });
  it.each(['actualizar', 'desactivar'])('rechaza %s de un bloque ajeno o inexistente', async (operacion) => {
    repositorio.buscarPropio.mockResolvedValue(null);
    const resultado = operacion === 'actualizar' ? new ActualizarBloqueUseCase(repositorio).ejecutar(10n, 1n, {}) : new DesactivarBloqueUseCase(repositorio).ejecutar(10n, 1n);
    await expect(resultado).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect(repositorio.actualizarDisponible).not.toHaveBeenCalled();
    expect(repositorio.desactivarDisponible).not.toHaveBeenCalled();
  });
  it.each(['RESERVADO', 'INACTIVO'])('impide editar y desactivar un bloque %s', async (estadoBloque) => {
    repositorio.buscarPropio.mockResolvedValue({ ...bloque, estadoBloque });
    await expect(new ActualizarBloqueUseCase(repositorio).ejecutar(10n, 1n, { horaFin: '10:30' })).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    await expect(new DesactivarBloqueUseCase(repositorio).ejecutar(10n, 1n)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    expect(repositorio.actualizarDisponible).not.toHaveBeenCalled();
    expect(repositorio.desactivarDisponible).not.toHaveBeenCalled();
  });
  it('valida también el horario resultante de una actualización', async () => {
    await expect(new ActualizarBloqueUseCase(repositorio).ejecutar(10n, 1n, { horaFin: '08:00' })).rejects.toMatchObject({ codigo: 'ENTRADA_INVALIDA' });
    expect(repositorio.actualizarDisponible).not.toHaveBeenCalled();
  });
  it('desactiva sin solicitar la eliminación física', async () => {
    repositorio.desactivarDisponible.mockResolvedValue({ ...bloque, estadoBloque: 'INACTIVO' });
    await expect(new DesactivarBloqueUseCase(repositorio).ejecutar(10n, 1n)).resolves.toMatchObject({ estadoBloque: 'INACTIVO' });
    expect(repositorio.desactivarDisponible).toHaveBeenCalledWith(10n, 1n);
  });
  it('propaga conflictos de la escritura condicional', async () => {
    const error = new Error('Conflicto del repositorio');
    repositorio.actualizarDisponible.mockRejectedValue(error);
    await expect(new ActualizarBloqueUseCase(repositorio).ejecutar(10n, 1n, { horaFin: '10:30' })).rejects.toBe(error);
  });
});
