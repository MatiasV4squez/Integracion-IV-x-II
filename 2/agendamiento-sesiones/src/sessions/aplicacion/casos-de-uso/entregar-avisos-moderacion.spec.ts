import { EntregarAvisosModeracion } from './entregar-avisos-moderacion';
import type { RepositorioAvisosModeracion } from '../puertos/repositorio-avisos-moderacion.puerto';
import type { PublicadorModeracion } from '../puertos/publicador-moderacion.puerto';
import type { AvisoModeracion } from '../contratos/avisos-moderacion';

describe('Entrega durable de avisos de moderación', () => {
  let avisos: jest.Mocked<RepositorioAvisosModeracion>;
  let publicador: jest.Mocked<PublicadorModeracion>;
  let aplicacion: EntregarAvisosModeracion;
  const ahora = new Date('2026-10-13T12:00:00Z');
  let aviso: AvisoModeracion;

  beforeEach(() => {
    avisos = {
      registrarPendiente: jest.fn(),
      buscar: jest.fn(),
      existeConflictoPendiente: jest.fn().mockResolvedValue(false),
      consultarPendientes: jest.fn().mockResolvedValue([{ id_aviso: 7n }]),
      registrarIntento: jest.fn(),
    };
    publicador = {
      estaConfigurado: jest.fn().mockReturnValue(true),
      publicar: jest.fn().mockResolvedValue(true),
    };
    aviso = {
      id_aviso: 7n,
      id_sesion: 2n,
      fecha_creacion: ahora,
      fecha_entrega: null,
      contenido: {
        tipo: 'CONFLICTO_RESUELTO',
        id_sesion: '2',
        id_resolucion: '5',
        id_administrador: '3',
        estado_final: 'COMPLETADA',
        motivo_resolucion: 'Revisión de las declaraciones',
        observaciones: null,
        fecha_resolucion: ahora.toISOString(),
      },
    };
    avisos.buscar.mockImplementation(async () => aviso);
    aplicacion = new EntregarAvisosModeracion(
      avisos,
      publicador,
      { ahora: () => ahora },
      { error: jest.fn() },
    );
  });

  it('conserva el aviso ante un rechazo remoto y lo confirma en el reintento', async () => {
    publicador.publicar.mockResolvedValueOnce(false);
    expect(await aplicacion.procesar(7n)).toBe(false);
    expect(avisos.registrarIntento).toHaveBeenLastCalledWith(
      7n,
      undefined,
      expect.any(String),
    );
    await aplicacion.reenviarPendientes();
    expect(avisos.registrarIntento).toHaveBeenLastCalledWith(
      7n,
      ahora,
      undefined,
    );
    expect(publicador.publicar.mock.calls[0][0]).toEqual(
      publicador.publicar.mock.calls[1][0],
    );
  });

  it('no reenvía avisos confirmados ni inexistentes', async () => {
    aviso.fecha_entrega = ahora;
    expect(await aplicacion.procesar(7n)).toBe(false);
    avisos.buscar.mockResolvedValue(null);
    expect(await aplicacion.procesar(8n)).toBe(false);
    expect(publicador.publicar).not.toHaveBeenCalled();
  });

  it('aplaza una resolución mientras siga pendiente el aviso de conflicto', async () => {
    avisos.existeConflictoPendiente.mockResolvedValue(true);
    expect(await aplicacion.procesar(7n)).toBe(false);
    expect(publicador.publicar).not.toHaveBeenCalled();
    expect(avisos.registrarIntento).not.toHaveBeenCalled();
    avisos.existeConflictoPendiente.mockResolvedValue(false);
    expect(await aplicacion.procesar(7n)).toBe(true);
  });

  it('conserva el aviso si el publicador lanza un error inesperado', async () => {
    publicador.publicar.mockRejectedValue(new Error('Fallo remoto'));
    await expect(aplicacion.procesar(7n)).resolves.toBe(false);
    expect(avisos.registrarIntento).toHaveBeenCalledWith(
      7n,
      undefined,
      expect.any(String),
    );
  });

  it('tolera un fallo al guardar la confirmación para poder reintentar', async () => {
    avisos.registrarIntento.mockRejectedValue(
      new Error('Fallo de persistencia'),
    );
    await expect(aplicacion.procesar(7n)).resolves.toBe(false);
    expect(publicador.publicar).toHaveBeenCalledWith(aviso);
  });

  it('no consulta ni envía mientras falte la configuración del receptor', async () => {
    publicador.estaConfigurado.mockReturnValue(false);
    await aplicacion.procesar(7n);
    await aplicacion.reenviarPendientes();
    expect(avisos.buscar).not.toHaveBeenCalled();
    expect(avisos.consultarPendientes).not.toHaveBeenCalled();
    expect(publicador.publicar).not.toHaveBeenCalled();
  });
});
