import { GestionarDisponibilidadTutor } from './gestionar-disponibilidad-tutor';
import type { DisponibilidadTutor } from '../../dominio/entidades/disponibilidad-tutor';
import type { RepositorioDisponibilidadTutor } from '../puertos/repositorio-disponibilidad-tutor.puerto';
import { ErrorDisponibilidad } from '../../dominio/errores/error-disponibilidad';
import { ErrorSesion } from '../../dominio/errores/error-sesion';

function unaDisponibilidad(
  override: Partial<DisponibilidadTutor> = {},
): DisponibilidadTutor {
  return {
    id_disponibilidad: 1n,
    id_tutor: 9n,
    inicio: new Date('2027-07-15T14:00:00.000Z'),
    fin: new Date('2027-07-15T15:00:00.000Z'),
    estado: 'DISPONIBLE',
    fecha_creacion: new Date(),
    fecha_actualizacion: new Date(),
    ...override,
  };
}

function crearRepositorio(): jest.Mocked<RepositorioDisponibilidadTutor> {
  return {
    listarPorTutor: jest.fn(),
    buscarPorId: jest.fn(),
    crear: jest.fn(),
    actualizar: jest.fn(),
    eliminar: jest.fn(),
    existeSolapamiento: jest.fn(),
  };
}

describe('Gestionar disponibilidad del tutor mediante puertos', () => {
  let repositorio: ReturnType<typeof crearRepositorio>;
  let gestionar: GestionarDisponibilidadTutor;

  beforeEach(() => {
    repositorio = crearRepositorio();
    gestionar = new GestionarDisponibilidadTutor(repositorio);
  });

  it('lista los bloques de disponibilidad del tutor', async () => {
    const bloque = unaDisponibilidad();
    repositorio.listarPorTutor.mockResolvedValue([bloque]);

    const resultado = await gestionar.listarDisponibilidad('9');

    expect(repositorio.listarPorTutor).toHaveBeenCalledWith(9n, undefined);
    expect(resultado).toEqual([bloque]);
  });

  it('lista filtrando por estado y día', async () => {
    repositorio.listarPorTutor.mockResolvedValue([]);

    await gestionar.listarDisponibilidad('9', {
      estado: 'DISPONIBLE',
      dia: '2027-07-15',
    });

    expect(repositorio.listarPorTutor).toHaveBeenCalledWith(9n, {
      estado: 'DISPONIBLE',
      dia: '2027-07-15',
    });
  });

  it('rechaza id de tutor inválido al crear', async () => {
    await expect(
      gestionar.crearDisponibilidad('abc', {
        dia: '2027-07-15',
        hora_inicio: '10:00',
        hora_fin: '11:00',
      }),
    ).rejects.toBeInstanceOf(ErrorSesion);
  });

  it('crea un bloque de disponibilidad cuando no hay solapamiento', async () => {
    const creado = unaDisponibilidad({ id_disponibilidad: 2n });
    repositorio.existeSolapamiento.mockResolvedValue(false);
    repositorio.crear.mockResolvedValue(creado);

    const resultado = await gestionar.crearDisponibilidad('9', {
      dia: '2027-07-15',
      hora_inicio: '10:00',
      hora_fin: '11:00',
    });

    expect(repositorio.existeSolapamiento).toHaveBeenCalledWith(
      9n,
      expect.any(Date),
      expect.any(Date),
    );
    expect(repositorio.crear).toHaveBeenCalledWith({
      id_tutor: 9n,
      inicio: expect.any(Date),
      fin: expect.any(Date),
      estado: 'DISPONIBLE',
    });
    expect(resultado).toBe(creado);
  });

  it('rechaza la creación si hay solapamiento', async () => {
    repositorio.existeSolapamiento.mockResolvedValue(true);

    await expect(
      gestionar.crearDisponibilidad('9', {
        dia: '2027-07-15',
        hora_inicio: '10:00',
        hora_fin: '11:00',
      }),
    ).rejects.toThrow(ErrorDisponibilidad);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it('edita el horario de un bloque propio', async () => {
    const existente = unaDisponibilidad();
    const editada = unaDisponibilidad({
      inicio: new Date('2027-07-15T15:00:00.000Z'),
      fin: new Date('2027-07-15T16:00:00.000Z'),
    });
    repositorio.buscarPorId.mockResolvedValue(existente);
    repositorio.existeSolapamiento.mockResolvedValue(false);
    repositorio.actualizar.mockResolvedValue(editada);

    const resultado = await gestionar.editarDisponibilidad('9', '1', {
      hora_inicio: '15:00',
      hora_fin: '16:00',
    });

    expect(resultado).toBe(editada);
    expect(repositorio.actualizar).toHaveBeenCalledWith(1n, {
      inicio: expect.any(Date),
      fin: expect.any(Date),
      estado: undefined,
    });
  });

  it('rechaza editar un bloque de otro tutor', async () => {
    const existente = unaDisponibilidad({ id_tutor: 8n });
    repositorio.buscarPorId.mockResolvedValue(existente);

    await expect(
      gestionar.editarDisponibilidad('9', '1', { estado: 'RESERVADO' }),
    ).rejects.toThrow(ErrorDisponibilidad);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza editar un bloque inexistente', async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(
      gestionar.editarDisponibilidad('9', '999', { estado: 'RESERVADO' }),
    ).rejects.toThrow(ErrorDisponibilidad);
  });

  it('elimina un bloque propio disponible', async () => {
    const existente = unaDisponibilidad();
    repositorio.buscarPorId.mockResolvedValue(existente);
    repositorio.eliminar.mockResolvedValue(true);

    await gestionar.eliminarDisponibilidad('9', '1');

    expect(repositorio.eliminar).toHaveBeenCalledWith(1n);
  });

  it('rechaza eliminar un bloque ya reservado', async () => {
    const existente = unaDisponibilidad({ estado: 'RESERVADO' });
    repositorio.buscarPorId.mockResolvedValue(existente);

    await expect(gestionar.eliminarDisponibilidad('9', '1')).rejects.toThrow(
      ErrorDisponibilidad,
    );
    expect(repositorio.eliminar).not.toHaveBeenCalled();
  });

  it('rechaza eliminar un bloque de otro tutor', async () => {
    const existente = unaDisponibilidad({ id_tutor: 8n });
    repositorio.buscarPorId.mockResolvedValue(existente);

    await expect(gestionar.eliminarDisponibilidad('9', '1')).rejects.toThrow(
      ErrorDisponibilidad,
    );
  });
});
