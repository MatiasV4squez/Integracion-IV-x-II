import { LiberarBloques } from './liberar-bloques';
import { ErrorSesion } from '../../dominio/errores/error-sesion';
import type { RepositorioLiberaciones } from '../puertos/repositorio-liberaciones.puerto';

describe('Liberación durable de bloques', () => {
  let pendientes: jest.Mocked<RepositorioLiberaciones>;
  let sesiones: { existeSesionActivaEnBloque: jest.Mock };
  let disponibilidad: { liberar: jest.Mock };
  let aplicacion: LiberarBloques;
  const ahora = new Date('2026-10-13T12:00:00Z');

  beforeEach(() => {
    pendientes = {
      registrarPendiente: jest.fn(),
      buscar: jest.fn(),
      consultarPendientes: jest.fn(),
      registrarIntento: jest.fn(),
    };
    sesiones = {
      existeSesionActivaEnBloque: jest.fn().mockResolvedValue(false),
    };
    disponibilidad = { liberar: jest.fn().mockResolvedValue(undefined) };
    aplicacion = new LiberarBloques(
      pendientes,
      sesiones,
      disponibilidad,
      { ahora: () => ahora },
      { error: jest.fn() },
    );
    pendientes.buscar.mockResolvedValue({
      id_sesion: 1n,
      id_bloque: 5n,
      fecha_liberacion: null,
    });
    pendientes.consultarPendientes.mockResolvedValue([{ id_sesion: 1n }]);
  });

  it('libera el bloque y registra la confirmación', async () => {
    expect(await aplicacion.procesar(1n)).toBe(true);
    expect(disponibilidad.liberar).toHaveBeenCalledWith(5n);
    expect(pendientes.registrarIntento).toHaveBeenCalledWith(1n, ahora);
  });

  it('mantiene pendiente una liberación rechazada y permite reintentar', async () => {
    disponibilidad.liberar.mockRejectedValueOnce(
      new Error('Proveedor no disponible'),
    );
    expect(await aplicacion.procesar(1n)).toBe(false);
    expect(pendientes.registrarIntento).toHaveBeenNthCalledWith(
      1,
      1n,
      undefined,
      expect.any(String),
    );
    await aplicacion.reenviarPendientes();
    expect(pendientes.registrarIntento).toHaveBeenNthCalledWith(2, 1n, ahora);
  });

  it('no envía una liberación ya confirmada', async () => {
    pendientes.buscar.mockResolvedValue({
      id_sesion: 1n,
      id_bloque: 5n,
      fecha_liberacion: ahora,
    });
    expect(await aplicacion.procesar(1n)).toBe(false);
    expect(disponibilidad.liberar).not.toHaveBeenCalled();
  });

  it('no libera un bloque mientras otra sesión activa lo mantiene comprometido', async () => {
    sesiones.existeSesionActivaEnBloque.mockResolvedValue(true);
    expect(await aplicacion.procesar(1n)).toBe(false);
    expect(disponibilidad.liberar).not.toHaveBeenCalled();
    expect(pendientes.registrarIntento).toHaveBeenCalledWith(
      1n,
      undefined,
      expect.stringContaining('sesión activa'),
    );
  });

  it('completa el pendiente si el bloque dejó de existir', async () => {
    disponibilidad.liberar.mockRejectedValue(
      new ErrorSesion('NO_ENCONTRADA', 'Bloque eliminado'),
    );
    expect(await aplicacion.procesar(1n)).toBe(true);
    expect(pendientes.registrarIntento).toHaveBeenCalledWith(1n, ahora);
  });

  it('conserva pendiente si falla registrar la confirmación tras liberar', async () => {
    pendientes.registrarIntento.mockRejectedValue(
      new Error('BD no disponible'),
    );
    expect(await aplicacion.procesar(1n)).toBe(false);
    expect(disponibilidad.liberar).toHaveBeenCalledWith(5n);
  });

  it('no llama al proveedor si no hay registro pendiente', async () => {
    pendientes.buscar.mockResolvedValue(null);
    expect(await aplicacion.procesar(1n)).toBe(false);
    expect(disponibilidad.liberar).not.toHaveBeenCalled();
  });
});
