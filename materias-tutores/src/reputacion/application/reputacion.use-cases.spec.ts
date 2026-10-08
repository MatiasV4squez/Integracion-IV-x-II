import { RegistrarCalificacionUseCase } from './registrar-calificacion.use-case.js';
import { ConsultarReputacionUseCase } from './consultar-reputacion.use-case.js';
import type { ReputacionTransaccion } from './ports/reputacion.repository.js';

describe('Casos de uso de reputación', () => {
  const tx = {
    buscarEvento: vi.fn(),
    buscarPerfil: vi.fn(),
    tutorHabilitado: vi.fn(),
    registrarEvento: vi.fn(),
    acumularCalificacion: vi.fn(),
    guardarEstado: vi.fn(),
  };
  const repositorio = {
    consultarPerfil: vi.fn(),
    tutorHabilitado: vi.fn(),
    ejecutarTransaccion: vi.fn(),
  };
  const registrar = new RegistrarCalificacionUseCase(repositorio);
  const consultar = new ConsultarReputacionUseCase(repositorio);
  const evento = { idTutor: 10n, idCalificacion: 42n, puntuacion: 2 };

  beforeEach(() => {
    vi.resetAllMocks();
    repositorio.ejecutarTransaccion.mockImplementation((operacion: (tx: ReputacionTransaccion) => Promise<unknown>) => operacion(tx));
    tx.buscarEvento.mockResolvedValue(null);
    tx.tutorHabilitado.mockResolvedValue(true);
    tx.acumularCalificacion.mockResolvedValue({ idTutor: 10n, sumaCalificaciones: 7, cantidadCalificaciones: 3, estado: 'ACTIVO' });
  });

  it('registra evento y acumuladores y guarda revisión dentro de la transacción', async () => {
    await expect(registrar.ejecutar(evento)).resolves.toEqual({ idTutor: '10', promedio: 7 / 3, cantidadCalificaciones: 3, estado: 'EN_REVISION' });
    expect(tx.registrarEvento).toHaveBeenCalledExactlyOnceWith(evento);
    expect(tx.acumularCalificacion).toHaveBeenCalledExactlyOnceWith(10n, 2);
    expect(tx.guardarEstado).toHaveBeenCalledExactlyOnceWith(10n, 'EN_REVISION');
  });
  it('reconoce duplicados incluso si el tutor ya no tiene habilitación vigente', async () => {
    tx.buscarEvento.mockResolvedValue(evento);
    tx.buscarPerfil.mockResolvedValue({ idTutor: 10n, sumaCalificaciones: 7, cantidadCalificaciones: 3, estado: 'EN_REVISION' });
    tx.tutorHabilitado.mockResolvedValue(false);
    await expect(registrar.ejecutar(evento)).resolves.toMatchObject({ cantidadCalificaciones: 3 });
    expect(tx.tutorHabilitado).not.toHaveBeenCalled();
    expect(tx.registrarEvento).not.toHaveBeenCalled();
    expect(tx.acumularCalificacion).not.toHaveBeenCalled();
    expect(tx.guardarEstado).not.toHaveBeenCalled();
  });
  it.each([
    { ...evento, idTutor: 15n },
    { ...evento, puntuacion: 5 },
  ])('rechaza reutilizar un evento con datos distintos', async (anterior) => {
    tx.buscarEvento.mockResolvedValue(anterior);
    await expect(registrar.ejecutar(evento)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    expect(tx.registrarEvento).not.toHaveBeenCalled();
  });
  it('rechaza un duplicado sin perfil en lugar de inventar reputación', async () => {
    tx.buscarEvento.mockResolvedValue(evento);
    tx.buscarPerfil.mockResolvedValue(null);
    await expect(registrar.ejecutar(evento)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
  });
  it('rechaza un tutor no habilitado antes de guardar el evento', async () => {
    tx.tutorHabilitado.mockResolvedValue(false);
    await expect(registrar.ejecutar(evento)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    expect(tx.registrarEvento).not.toHaveBeenCalled();
  });
  it('rechaza entradas inválidas antes de abrir transacciones', async () => {
    await expect(registrar.ejecutar({ ...evento, puntuacion: 1.5 })).rejects.toMatchObject({ codigo: 'ENTRADA_INVALIDA' });
    await expect(registrar.ejecutar({ ...evento, idTutor: 0n })).rejects.toMatchObject({ codigo: 'ENTRADA_INVALIDA' });
    expect(repositorio.ejecutarTransaccion).not.toHaveBeenCalled();
  });
  it('propaga fallos de persistencia para permitir el rollback', async () => {
    const error = new Error('fallo al acumular');
    tx.acumularCalificacion.mockRejectedValue(error);
    await expect(registrar.ejecutar(evento)).rejects.toBe(error);
    expect(tx.guardarEstado).not.toHaveBeenCalled();
  });
  it('consulta reputación sin escribir en la base', async () => {
    repositorio.consultarPerfil.mockResolvedValue({ idTutor: 10n, sumaCalificaciones: 18, cantidadCalificaciones: 4, estado: 'ACTIVO' });
    await expect(consultar.ejecutar(10n)).resolves.toMatchObject({ promedio: 4.5 });
    expect(repositorio.ejecutarTransaccion).not.toHaveBeenCalled();
  });
  it('devuelve promedio null para un tutor habilitado sin perfil', async () => {
    repositorio.consultarPerfil.mockResolvedValue(null);
    repositorio.tutorHabilitado.mockResolvedValue(true);
    await expect(consultar.ejecutar(10n)).resolves.toEqual({ idTutor: '10', promedio: null, cantidadCalificaciones: 0, estado: 'ACTIVO' });
  });
  it('rechaza consultar un tutor inexistente', async () => {
    repositorio.consultarPerfil.mockResolvedValue(null);
    repositorio.tutorHabilitado.mockResolvedValue(false);
    await expect(consultar.ejecutar(10n)).rejects.toMatchObject({ codigo: 'TUTOR_NO_ENCONTRADO' });
  });
});
