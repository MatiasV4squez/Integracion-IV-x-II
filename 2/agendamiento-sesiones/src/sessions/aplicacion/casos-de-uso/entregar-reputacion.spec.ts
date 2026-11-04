import { EntregarReputacion } from './entregar-reputacion';
import type { RepositorioEntregas } from '../puertos/repositorio-entregas.puerto';
import type { PublicadorReputacion } from '../puertos/publicador-reputacion.puerto';

describe('Entrega durable de reputación mediante puertos', () => {
  let entregas: jest.Mocked<RepositorioEntregas>;
  let publicador: jest.Mocked<PublicadorReputacion>;
  let aplicacion: EntregarReputacion;
  const ahora = new Date('2026-10-07T12:00:00Z');

  beforeEach(() => {
    entregas = {
      registrarPendiente: jest.fn(),
      buscar: jest.fn(),
      consultarPendientes: jest.fn(),
      registrarIntento: jest.fn(),
    };
    publicador = {
      estaConfigurado: jest.fn().mockReturnValue(true),
      publicar: jest.fn(),
    };
    aplicacion = new EntregarReputacion(entregas, publicador, {
      ahora: () => ahora,
    });
    entregas.buscar.mockResolvedValue({
      fecha_entrega: null,
      calificacion: {
        id_calificacion: 1n,
        id_sesion: 2n,
        id_evaluador: 3n,
        id_evaluado: 4n,
        puntuacion: 5,
        fecha_calificacion: ahora,
      },
    });
    entregas.consultarPendientes.mockResolvedValue([{ id_calificacion: 1n }]);
  });

  it('conserva pendiente una entrega rechazada y marca su reintento exitoso', async () => {
    publicador.publicar
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    expect(await aplicacion.enviarCalificacion(1n)).toBe(false);
    expect(entregas.registrarIntento).toHaveBeenNthCalledWith(1, 1n, undefined);
    await aplicacion.reenviarPendientes();
    expect(entregas.registrarIntento).toHaveBeenNthCalledWith(2, 1n, ahora);
  });

  it('no reenvía una entrega que ya fue confirmada', async () => {
    entregas.buscar.mockResolvedValue({
      ...(await entregas.buscar(1n))!,
      fecha_entrega: ahora,
    });
    expect(await aplicacion.enviarCalificacion(1n)).toBe(false);
    expect(publicador.publicar).not.toHaveBeenCalled();
    expect(entregas.registrarIntento).not.toHaveBeenCalled();
  });

  it('no procesa pendientes cuando no existe un destino configurado', async () => {
    publicador.estaConfigurado.mockReturnValue(false);
    await aplicacion.reenviarPendientes();
    expect(entregas.consultarPendientes).not.toHaveBeenCalled();
  });
});
